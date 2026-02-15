/**
 * Supabase Configuration
 * 
 * Usando Supabase como backend para:
 * - Autenticação (Auth)
 * - Banco de dados (PostgreSQL)
 * - Storage (arquivos temporários se necessário)
 */

import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente Supabase (client-side)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos do banco de dados
export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    email: string;
                    name: string;
                    created_at: string;
                    updated_at: string;
                    last_login_at: string | null;
                };
                Insert: {
                    id?: string;
                    email: string;
                    name: string;
                    created_at?: string;
                    updated_at?: string;
                    last_login_at?: string | null;
                };
                Update: {
                    id?: string;
                    email?: string;
                    name?: string;
                    created_at?: string;
                    updated_at?: string;
                    last_login_at?: string | null;
                };
            };
            anonymous_sessions: {
                Row: {
                    id: string;
                    token: string;
                    created_at: string;
                    expires_at: string;
                    request_count: number;
                    last_activity_at: string;
                    ip_hash: string | null;
                };
                Insert: {
                    id?: string;
                    token: string;
                    created_at?: string;
                    expires_at: string;
                    request_count?: number;
                    last_activity_at?: string;
                    ip_hash?: string | null;
                };
                Update: {
                    id?: string;
                    token?: string;
                    created_at?: string;
                    expires_at?: string;
                    request_count?: number;
                    last_activity_at?: string;
                    ip_hash?: string | null;
                };
            };
            activity_logs: {
                Row: {
                    id: string;
                    user_id: string;
                    action: string;
                    timestamp: string;
                    duration: number | null;
                    success: boolean;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    action: string;
                    timestamp?: string;
                    duration?: number | null;
                    success?: boolean;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    action?: string;
                    timestamp?: string;
                    duration?: number | null;
                    success?: boolean;
                };
            };
            anonymous_activity_logs: {
                Row: {
                    id: string;
                    session_id: string;
                    action: string;
                    timestamp: string;
                };
                Insert: {
                    id?: string;
                    session_id: string;
                    action: string;
                    timestamp?: string;
                };
                Update: {
                    id?: string;
                    session_id?: string;
                    action?: string;
                    timestamp?: string;
                };
            };
            challenges: {
                Row: {
                    id: string;
                    title: string;
                    description: string;
                    difficulty: string;
                    category: string;
                    points: number;
                    image_url: string | null;
                    solution: string;
                    hints: string[];
                    created_at: string;
                    active: boolean;
                };
                Insert: {
                    id?: string;
                    title: string;
                    description: string;
                    difficulty: string;
                    category: string;
                    points: number;
                    image_url?: string | null;
                    solution: string;
                    hints?: string[];
                    created_at?: string;
                    active?: boolean;
                };
                Update: {
                    id?: string;
                    title?: string;
                    description?: string;
                    difficulty?: string;
                    category?: string;
                    points?: number;
                    image_url?: string | null;
                    solution?: string;
                    hints?: string[];
                    created_at?: string;
                    active?: boolean;
                };
            };
            challenge_completions: {
                Row: {
                    id: string;
                    user_id: string;
                    challenge_id: string;
                    completed_at: string;
                    time_spent: number;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    challenge_id: string;
                    completed_at?: string;
                    time_spent: number;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    challenge_id?: string;
                    completed_at?: string;
                    time_spent?: number;
                };
            };
            user_stats: {
                Row: {
                    id: string;
                    user_id: string;
                    total_analyses: number;
                    metadata_scans: number;
                    steganography_ops: number;
                    ela_analyses: number;
                    challenges_completed: number;
                    total_points: number;
                    learning_score: number;
                    last_updated: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    total_analyses?: number;
                    metadata_scans?: number;
                    steganography_ops?: number;
                    ela_analyses?: number;
                    challenges_completed?: number;
                    total_points?: number;
                    learning_score?: number;
                    last_updated?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    total_analyses?: number;
                    metadata_scans?: number;
                    steganography_ops?: number;
                    ela_analyses?: number;
                    challenges_completed?: number;
                    total_points?: number;
                    learning_score?: number;
                    last_updated?: string;
                };
            };
        };
    };
}

// Cliente tipado
export const supabaseTyped = createClient<Database>(supabaseUrl, supabaseAnonKey);
