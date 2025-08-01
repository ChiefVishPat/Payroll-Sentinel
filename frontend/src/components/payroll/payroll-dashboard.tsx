"use client";

import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@frontend/components/ui/card";
import { Button } from "@frontend/components/ui/button";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
} from "@frontend/lib/utils";
import { api, apiClient } from "@frontend/lib/api";
import { useCompany } from "@frontend/context/CompanyContext";
import CompanySelector from "@frontend/components/CompanySelector";
import { PayrollRun } from "@frontend/types";
import type { Employee, PayrollSummary } from "@frontend/shared/types";
import {
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  Play,
  RefreshCw,
  Loader,
} from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from "@frontend/components/ui/dialog";
import { useState } from "react";
import { DEPARTMENTS, TITLES } from "@frontend/lib/job-data";
import EmployeeDetailPanel from "@frontend/components/payroll/employee-detail-panel";
import RunDrawer from "@frontend/components/payroll/RunDrawer";
import RunModal from "@frontend/components/payroll/RunModal";

/**
 * Payroll dashboard page showing payroll data and employee roster.
 * SWR auto refresh is disabled so the modal form doesn't reset while typing.
 */
export default function PayrollDashboard() {
  const { companyId } = useCompany();
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "processed" | "draft"
  >("all");
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);

  const fetcher = (url: string) => apiClient.get(url).then((res) => res.data);

  // Allow initial fetch on mount so dashboard loads data automatically
  const swrOpts = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateOnMount: true,
    revalidateIfStale: false,
    refreshInterval: 0,
  };

  const runsUrl = companyId ? `/api/payroll/runs?companyId=${companyId}` : null;
  const {
    data: payrollRuns,
    isLoading: loadingRuns,
    mutate: mutRuns,
  } = useSWR(runsUrl, fetcher, swrOpts);
  const {
    data: employees,
    isLoading: loadingEmp,
    mutate: mutEmp,
  } = useSWR(
    companyId ? `/api/payroll/employees?companyId=${companyId}` : null,
    fetcher,
    swrOpts,
  );
  const {
    data: summary,
    isLoading: loadingSummary,
    mutate: mutSum,
  } = useSWR<PayrollSummary>(
    companyId ? `/api/payroll/summary?companyId=${companyId}` : null,
    fetcher,
    swrOpts,
  );

  if (!companyId) {
    return <CompanySelector />;
  }

  const loading =
    loadingRuns || loadingEmp || loadingSummary || refreshing || running;

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([mutRuns(), mutEmp(), mutSum()]);
    setRefreshing(false);
  };

  const approvePayroll = async (runId: string) => {
    try {
      await api.payroll.approveRun(runId, companyId);
      await mutRuns();
    } catch (error) {
      console.error("Error approving payroll:", error);
    }
  };

  const processPayroll = async (runId: string) => {
    try {
      await api.payroll.processRun(runId, companyId);
      await mutRuns();
    } catch (error) {
      console.error("Error processing payroll:", error);
    }
  };

  /** Trigger a new payroll run */
  const runPayroll = async () => {
    try {
      setRunning(true);
      await api.payroll.runPayroll({ companyId });
      await Promise.all([mutRuns(), mutSum()]);
    } catch (err) {
      console.error("Run payroll failed", err);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--c-text)]">Payroll</h1>
          <p className="text-[var(--c-text-subtle)]">Manage payroll runs and employees</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2"
          >
            <span className="text-xl">➕</span> New Run
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <span className="text-xl">➕</span> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="text-[var(--c-text)]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Add Employee</h2>
                <DialogClose asChild>
                  <Button variant="ghost" size="sm">
                    Close
                  </Button>
                </DialogClose>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  await api.payroll.addEmployee({
                    companyId,
                    name: formData.get("name"),
                    title: formData.get("title"),
                    salary: Number(formData.get("salary") || 0),
                    status: formData.get("status"),
                    department: formData.get("department"),
                  });
                  await Promise.all([mutEmp(), mutSum()]);
                  setOpen(false);
                  e.currentTarget.reset();
                }}
                className="space-y-4"
              >
                <input
                  name="name"
                  placeholder="Name"
                  className="w-full rounded border border-[var(--c-border)] bg-[var(--c-surface-1)] p-2 text-[var(--c-text)]"
                  required
                />
                <input
                  list="title-options"
                  name="title"
                  placeholder="Title"
                  className="w-full rounded border border-[var(--c-border)] bg-[var(--c-surface-1)] p-2 text-[var(--c-text)]"
                  required
                />
                <datalist id="title-options">
                  {TITLES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <input
                  list="department-options"
                  name="department"
                  placeholder="Department"
                  className="w-full rounded border border-[var(--c-border)] bg-[var(--c-surface-1)] p-2 text-[var(--c-text)]"
                />
                <datalist id="department-options">
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
                <input
                  name="salary"
                  type="number"
                  step="0.01"
                  placeholder="Salary"
                  className="w-full rounded border border-[var(--c-border)] bg-[var(--c-surface-1)] p-2 text-[var(--c-text)]"
                  required
                />
                <select
                  name="status"
                  className="w-full rounded border border-[var(--c-border)] bg-[var(--c-surface-1)] p-2 text-[var(--c-text)]"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
                <Button type="submit">Save</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            onClick={runPayroll}
            className="flex items-center gap-2"
            disabled={running}
          >
            {running ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run Payroll
          </Button>
          <Button
            onClick={refreshData}
            className="flex items-center gap-2"
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-[var(--c-surface-1)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-[var(--c-info)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--c-info)]">
              {summary?.totalEmployees || 0}
            </div>
            <p className="text-xs text-[var(--c-text-subtle)] mt-1">Total employees</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--c-surface-1)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Payroll
            </CardTitle>
            <DollarSign className="h-4 w-4 text-[var(--c-success)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--c-success)]">
              {summary ? formatCurrency(summary.monthlyPayroll) : "$0"}
            </div>
            <p className="text-xs text-[var(--c-text-subtle)] mt-1">Total monthly cost</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--c-surface-1)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payroll</CardTitle>
            <Calendar className="h-4 w-4 text-[var(--c-accent)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--c-accent)]">
              {summary?.nextPayroll
                ? formatDate(summary.nextPayroll)
                : "Not scheduled"}
            </div>
            <p className="text-xs text-[var(--c-text-subtle)] mt-1">Scheduled date</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--c-surface-1)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Runs</CardTitle>
            <Clock className="h-4 w-4 text-[var(--c-warning)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--c-warning)]">
              {summary?.pendingRuns ?? 0}
            </div>
            <p className="text-xs text-[var(--c-text-subtle)] mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Runs */}
      <Card className="bg-[var(--c-surface-1)]">
        <CardHeader>
          <CardTitle>Payroll Runs</CardTitle>
          <CardDescription>Recent and upcoming payroll runs</CardDescription>
          <div className="mt-2 flex gap-2">
            {["all", "pending", "approved", "processed", "draft"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filter === s ? "default" : "outline"}
                onClick={() => setFilter(s as any)}
              >
                {s}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(payrollRuns?.data || []).filter((r) =>
              filter === "all" ? true : r.status === filter,
            ).length === 0 ? (
              <div className="text-center py-8 text-[var(--c-text-disabled)]">
                No payroll runs found
              </div>
            ) : (
              (payrollRuns?.data || [])
                .filter((run) =>
                  filter === "all" ? true : run.status === filter,
                )
                .map((run: PayrollRun) => (
                  <div
                    key={run.id}
                  className="flex items-center justify-between p-4 border border-[var(--c-border)] rounded cursor-pointer hover:bg-[var(--c-surface-3)]"
                    onClick={() => {
                      setSelectedRun(run);
                      setRunPanelOpen(true);
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`px-2 py-1 text-xs rounded ${getStatusColor(run.status)}`}
                        >
                          {run.status}
                        </div>
                        <div className="font-medium">
                          {(() => {
                            const r: any = run;
                            const start =
                              r.pay_period_start ?? r.payPeriodStart;
                            const end = r.pay_period_end ?? r.payPeriodEnd;
                            return `${start} to ${end}`;
                          })()}
                        </div>
                      </div>
                      <div className="text-sm text-[var(--c-text-subtle)]">
                        {formatCurrency(
                          (run as any).total_gross ?? (run as any).totalAmount,
                        )}{" "}
                        for {summary?.totalEmployees ?? run.employee_count} employees
                      </div>
                      <div className="text-xs text-[var(--c-text-disabled)] mt-1">
                        Scheduled:{" "}
                        {formatDate(
                          (run as any).pay_date ?? (run as any).payDate,
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {run.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            // Prevent the row click handler from opening the drawer
                            e.stopPropagation();
                            approvePayroll(run.id);
                          }}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </Button>
                      )}
                      {run.status === "approved" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            // Prevent the row click handler from opening the drawer
                            e.stopPropagation();
                            processPayroll(run.id);
                          }}
                          className="flex items-center gap-1"
                        >
                          <Play className="h-4 w-4" />
                          Process
                        </Button>
                      )}
                      {run.status === "processed" && (
                        <CheckCircle className="h-5 w-5 text-[var(--c-success)]" />
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card className="bg-[var(--c-surface-1)]">
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>Active employee roster</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(employees?.data || []).length === 0 ? (
              <div className="text-center py-8 text-[var(--c-text-disabled)]">
                No employees found
              </div>
            ) : (
              (employees?.data || []).map((employee: Employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 rounded border border-[var(--c-border)] bg-[var(--c-surface-1)] cursor-pointer hover:bg-[var(--c-surface-3)]"
                  onClick={() => {
                    setSelected(employee);
                    setDetailOpen(true);
                  }}
                >
                  <div className="flex-1">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-[var(--c-text-subtle)]">
                      {employee.title}
                    </div>
                    {employee.created_at && (
                      <div className="text-xs text-[var(--c-text-disabled)]">
                        {employee.department || "General"} • Started{" "}
                        {formatDate(employee.created_at)}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(employee.salary)}
                    </div>
                    <div
                      className={`text-sm px-2 py-1 rounded ${getStatusColor(employee.status)}`}
                    >
                      {employee.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      {selected && (
        <EmployeeDetailPanel
          employee={selected}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onUpdated={async () => {
            await Promise.all([mutEmp(), mutSum()]);
          }}
        />
      )}
      {selectedRun && (
        <RunDrawer
          run={selectedRun}
          open={runPanelOpen}
          onOpenChange={setRunPanelOpen}
          onUpdated={async () => {
            await Promise.all([mutRuns(), mutSum()]);
          }}
        />
      )}
      <RunModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={async () => {
          await Promise.all([mutRuns(), mutSum()]);
        }}
      />
    </div>
  );
}
