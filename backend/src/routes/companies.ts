import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabase } from '../db/client';
import { CreateCompanyInput } from '../db/types';

export const companiesRoutes = async (fastify: FastifyInstance): Promise<void> => {
  // Schema definitions for Swagger
  const companySchema = {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      created_at: { type: 'string', format: 'date-time' },
      updated_at: { type: 'string', format: 'date-time' },
    },
  };

  const createCompanySchema = {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 255 },
    },
  };

  // Get all companies
  fastify.get('/', {
    schema: {
      description: 'Get all companies',
      tags: ['companies'],
      security: [{ apiKey: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            companies: {
              type: 'array',
              items: companySchema,
            },
            total: { type: 'number' },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { data: companies, error, count } = await supabase
        .from('companies')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (error) {
        fastify.log.error('Failed to fetch companies:', error);
        return reply.status(500).send({
          error: true,
          message: 'Failed to fetch companies',
        });
      }

      return reply.send({
        companies: companies || [],
        total: count || 0,
      });
    } catch (error) {
      fastify.log.error('Unexpected error fetching companies:', error);
      return reply.status(500).send({
        error: true,
        message: 'Internal server error',
      });
    }
  });

  // Get company by ID
  fastify.get('/:id', {
    schema: {
      description: 'Get company by ID',
      tags: ['companies'],
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: companySchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{Params: {id: string}}>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return reply.status(404).send({
            error: true,
            message: 'Company not found',
          });
        }
        
        fastify.log.error('Failed to fetch company:', error);
        return reply.status(500).send({
          error: true,
          message: 'Failed to fetch company',
        });
      }

      return reply.send(company);
    } catch (error) {
      fastify.log.error('Unexpected error fetching company:', error);
      return reply.status(500).send({
        error: true,
        message: 'Internal server error',
      });
    }
  });

  // Create new company
  fastify.post('/', {
    schema: {
      description: 'Create a new company',
      tags: ['companies'],
      security: [{ apiKey: [] }],
      body: createCompanySchema,
      response: {
        201: companySchema,
        400: {
          type: 'object',
          properties: {
            error: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{Body: CreateCompanyInput}>, reply: FastifyReply) => {
    try {
      const { name } = request.body;

      // Validate input
      if (!name || name.trim().length === 0) {
        return reply.status(400).send({
          error: true,
          message: 'Company name is required',
        });
      }

      const { data: company, error } = await supabase
        .from('companies')
        .insert([{ name: name.trim() }])
        .select()
        .single();

      if (error) {
        fastify.log.error('Failed to create company:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        return reply.status(500).send({
          error: true,
          message: 'Failed to create company',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }

      return reply.status(201).send(company);
    } catch (error) {
      fastify.log.error('Unexpected error creating company:', error);
      return reply.status(500).send({
        error: true,
        message: 'Internal server error',
      });
    }
  });

  // Update company
  fastify.put('/:id', {
    schema: {
      description: 'Update company by ID',
      tags: ['companies'],
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
        },
        required: ['name'],
      },
      response: {
        200: companySchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{Params: {id: string}, Body: CreateCompanyInput}>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const { name } = request.body;

      if (!name || name.trim().length === 0) {
        return reply.status(400).send({
          error: true,
          message: 'Company name is required',
        });
      }

      const { data: company, error } = await supabase
        .from('companies')
        .update({ name: name.trim() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return reply.status(404).send({
            error: true,
            message: 'Company not found',
          });
        }
        
        fastify.log.error('Failed to update company:', error);
        return reply.status(500).send({
          error: true,
          message: 'Failed to update company',
        });
      }

      return reply.send(company);
    } catch (error) {
      fastify.log.error('Unexpected error updating company:', error);
      return reply.status(500).send({
        error: true,
        message: 'Internal server error',
      });
    }
  });

  // Delete company
  fastify.delete('/:id', {
    schema: {
      description: 'Delete company by ID',
      tags: ['companies'],
      security: [{ apiKey: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        204: {
          type: 'null',
          description: 'Company deleted successfully',
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{Params: {id: string}}>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return reply.status(404).send({
            error: true,
            message: 'Company not found',
          });
        }
        
        fastify.log.error('Failed to delete company:', error);
        return reply.status(500).send({
          error: true,
          message: 'Failed to delete company',
        });
      }

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error('Unexpected error deleting company:', error);
      return reply.status(500).send({
        error: true,
        message: 'Internal server error',
      });
    }
  });
};
