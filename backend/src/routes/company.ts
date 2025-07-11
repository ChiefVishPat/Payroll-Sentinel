import { FastifyInstance } from 'fastify';
import { supabase } from '../db/client';

/** minimal company routes */
export default async function companyRoutes(app: FastifyInstance) {
  app.post('/companies', async (req, reply) => {
    const { name, ein, state } = req.body as { name: string; ein: string; state: string };
    const { data, error } = await supabase
      .from('companies')
      .insert([{ name, ein, state }])
      .select('id')
      .single();
    if (error) return reply.status(500).send({ error: error.message });
    return reply.send({ companyId: data!.id });
  });
}
