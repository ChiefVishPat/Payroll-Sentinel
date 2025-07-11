import React, { useState, FormEvent } from 'react';
import { apiClient } from '../lib/api';

/**
 * Props for NewCompanyForm component
 * @param onCreated Callback invoked with the new company ID after successful creation
 */
interface NewCompanyFormProps {
  onCreated: (id: string) => void;
}

/**
 * Controlled form for creating a new company
 */
export const NewCompanyForm: React.FC<NewCompanyFormProps> = ({ onCreated }) => {
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await apiClient.post('/api/companies', { name });
      const { success, data } = response.data;
      if (success && data?.id) {
        onCreated(data.id);
        setName('');
      } else {
        setError('Failed to create company.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Company Name"
        disabled={loading}
      />
      <button type="submit" disabled={loading || !name.trim()}>
        {loading ? 'Creating...' : 'Create Company'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
};
