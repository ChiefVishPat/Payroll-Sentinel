import { nanoid } from 'nanoid'

/**
 * Simple CheckHQ mock service used for sandbox demo.
 * Generates deterministic IDs and returns paid status immediately.
 */
export class CheckMockService {
  /** Create a mock company */
  async createCompany() {
    return { company_id: `cmp_${nanoid(8)}` }
  }

  /** Create a mock pay schedule */
  async createPaySchedule() {
    return { pay_schedule_id: `ps_${nanoid(8)}` }
  }

  /** Run payroll and immediately return paid status */
  async runPayroll() {
    return { payroll_run_id: `pr_${nanoid(8)}`, status: 'paid' }
  }
}
