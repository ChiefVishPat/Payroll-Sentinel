import { nanoid } from 'nanoid';

/** Simple CheckHQ mock for sandbox mode */
export class CheckMockService {
  private readonly log;

  constructor(log: any) {
    this.log = log.child({ mod: 'CheckMock' });
  }

  /** create a mock company */
  async createCompany() {
    const id = 'cmp_' + nanoid(8);
    this.log.info({ id }, 'mock create company');
    return { company_id: id };
  }

  /** create a mock pay schedule */
  async createPaySchedule() {
    const id = 'ps_' + nanoid(8);
    this.log.info({ id }, 'mock create schedule');
    return { pay_schedule_id: id };
  }

  /** simulate running payroll */
  async runPayroll() {
    const id = 'pr_' + nanoid(8);
    this.log.info({ id }, 'mock run payroll');
    return { payroll_run_id: id, status: 'paid' };
  }
}
