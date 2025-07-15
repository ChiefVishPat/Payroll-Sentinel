export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)';
  };
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string;
          company_id: string;
          created_at: string | null;
          id: string;
          message_content: string | null;
          risk_assessment_id: string;
          sent_at: string | null;
          slack_message_ts: string | null;
          status: string;
        };
        Insert: {
          alert_type?: string;
          company_id: string;
          created_at?: string | null;
          id?: string;
          message_content?: string | null;
          risk_assessment_id: string;
          sent_at?: string | null;
          slack_message_ts?: string | null;
          status?: string;
        };
        Update: {
          alert_type?: string;
          company_id?: string;
          created_at?: string | null;
          id?: string;
          message_content?: string | null;
          risk_assessment_id?: string;
          sent_at?: string | null;
          slack_message_ts?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'alerts_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alerts_risk_assessment_id_fkey';
            columns: ['risk_assessment_id'];
            isOneToOne: false;
            referencedRelation: 'risk_assessments';
            referencedColumns: ['id'];
          },
        ];
      };
      balance_snapshots: {
        Row: {
          available_balance: number | null;
          balance: number;
          bank_account_id: string;
          created_at: string | null;
          id: string;
          snapshot_date: string | null;
        };
        Insert: {
          available_balance?: number | null;
          balance: number;
          bank_account_id: string;
          created_at?: string | null;
          id?: string;
          snapshot_date?: string | null;
        };
        Update: {
          available_balance?: number | null;
          balance?: number;
          bank_account_id?: string;
          created_at?: string | null;
          id?: string;
          snapshot_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'balance_snapshots_bank_account_id_fkey';
            columns: ['bank_account_id'];
            isOneToOne: false;
            referencedRelation: 'bank_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      bank_accounts: {
        Row: {
          account_name: string;
          account_subtype: string | null;
          account_type: string;
          company_id: string;
          created_at: string | null;
          id: string;
          institution_name: string | null;
          is_active: boolean | null;
          plaid_access_token: string;
          plaid_account_id: string;
          updated_at: string | null;
        };
        Insert: {
          account_name: string;
          account_subtype?: string | null;
          account_type: string;
          company_id: string;
          created_at?: string | null;
          id?: string;
          institution_name?: string | null;
          is_active?: boolean | null;
          plaid_access_token: string;
          plaid_account_id: string;
          updated_at?: string | null;
        };
        Update: {
          account_name?: string;
          account_subtype?: string | null;
          account_type?: string;
          company_id?: string;
          created_at?: string | null;
          id?: string;
          institution_name?: string | null;
          is_active?: boolean | null;
          plaid_access_token?: string;
          plaid_account_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'bank_accounts_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      companies: {
        Row: {
          check_company_id: string;
          created_at: string | null;
          ein: string;
          id: string;
          name: string;
          state: string;
          updated_at: string | null;
        };
        Insert: {
          check_company_id: string;
          created_at?: string | null;
          ein: string;
          id?: string;
          name: string;
          state: string;
          updated_at?: string | null;
        };
        Update: {
          check_company_id?: string;
          created_at?: string | null;
          ein?: string;
          id?: string;
          name?: string;
          state?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          annual_salary: number | null;
          company_id: string | null;
          created_at: string | null;
          department: string | null;
          email: string;
          employee_number: string;
          first_name: string;
          hourly_rate: number | null;
          id: string;
          is_active: boolean | null;
          last_name: string;
          updated_at: string | null;
        };
        Insert: {
          annual_salary?: number | null;
          company_id?: string | null;
          created_at?: string | null;
          department?: string | null;
          email: string;
          employee_number: string;
          first_name: string;
          hourly_rate?: number | null;
          id?: string;
          is_active?: boolean | null;
          last_name: string;
          updated_at?: string | null;
        };
        Update: {
          annual_salary?: number | null;
          company_id?: string | null;
          created_at?: string | null;
          department?: string | null;
          email?: string;
          employee_number?: string;
          first_name?: string;
          hourly_rate?: number | null;
          id?: string;
          is_active?: boolean | null;
          last_name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'employees_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      payroll_entries: {
        Row: {
          created_at: string | null;
          deductions: number | null;
          employee_id: string | null;
          gross_pay: number;
          hours: number | null;
          id: string;
          net_pay: number;
          payroll_run_id: string | null;
          status: string | null;
          taxes: number | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          deductions?: number | null;
          employee_id?: string | null;
          gross_pay: number;
          hours?: number | null;
          id?: string;
          net_pay: number;
          payroll_run_id?: string | null;
          status?: string | null;
          taxes?: number | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          deductions?: number | null;
          employee_id?: string | null;
          gross_pay?: number;
          hours?: number | null;
          id?: string;
          net_pay?: number;
          payroll_run_id?: string | null;
          status?: string | null;
          taxes?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payroll_entries_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payroll_entries_payroll_run_id_fkey';
            columns: ['payroll_run_id'];
            isOneToOne: false;
            referencedRelation: 'payroll_runs';
            referencedColumns: ['id'];
          },
        ];
      };
      payroll_runs: {
        Row: {
          check_payroll_id: string;
          company_id: string;
          created_at: string | null;
          id: string;
          pay_date: string;
          status: string;
          total_amount: number;
          updated_at: string | null;
        };
        Insert: {
          check_payroll_id: string;
          company_id: string;
          created_at?: string | null;
          id?: string;
          pay_date: string;
          status?: string;
          total_amount: number;
          updated_at?: string | null;
        };
        Update: {
          check_payroll_id?: string;
          company_id?: string;
          created_at?: string | null;
          id?: string;
          pay_date?: string;
          status?: string;
          total_amount?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payroll_runs_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      risk_assessments: {
        Row: {
          assessed_at: string | null;
          bank_account_id: string;
          company_id: string;
          created_at: string | null;
          current_balance: number;
          days_until_payroll: number;
          id: string;
          payroll_run_id: string;
          required_float: number;
          risk_status: string;
          runway_days: number | null;
        };
        Insert: {
          assessed_at?: string | null;
          bank_account_id: string;
          company_id: string;
          created_at?: string | null;
          current_balance: number;
          days_until_payroll: number;
          id?: string;
          payroll_run_id: string;
          required_float: number;
          risk_status: string;
          runway_days?: number | null;
        };
        Update: {
          assessed_at?: string | null;
          bank_account_id?: string;
          company_id?: string;
          created_at?: string | null;
          current_balance?: number;
          days_until_payroll?: number;
          id?: string;
          payroll_run_id?: string;
          required_float?: number;
          risk_status?: string;
          runway_days?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'risk_assessments_bank_account_id_fkey';
            columns: ['bank_account_id'];
            isOneToOne: false;
            referencedRelation: 'bank_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'risk_assessments_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'risk_assessments_payroll_run_id_fkey';
            columns: ['payroll_run_id'];
            isOneToOne: false;
            referencedRelation: 'payroll_runs';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;