import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // MongoDB (Document Store)
  MONGO_URI: z.string().default('mongodb://localhost:27017/campus_resource_graph'),

  // Neo4j (Graph Store)
  NEO4J_URI: z.string().default('bolt://localhost:7687'),
  NEO4J_USER: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string().default('campusgraphpassword'),

  // Redis (Key-Value / Cache Store)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  // Cassandra (Wide-Column Store)
  CASSANDRA_CONTACT_POINTS: z.string().default('localhost'),
  CASSANDRA_LOCAL_DC: z.string().default('datacenter1'),
  CASSANDRA_KEYSPACE: z.string().default('campus_telemetry'),
  CASSANDRA_PORT: z.coerce.number().default(9042),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const ENV = parsed.data;
