import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gcplzhcrhgbwpfberwvm.supabase.co'

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjcGx6aGNyaGdid3BmYmVyd3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDE4NjIsImV4cCI6MjA5NDI3Nzg2Mn0.BObYWoV1AsZLCtSp6Gqku7dkRn3pU9HJZp6atpzUWGI'

export const supabase = createClient(supabaseUrl, supabaseKey)