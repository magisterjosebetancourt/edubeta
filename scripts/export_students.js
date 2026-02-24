import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://dvhbjhttgwnpdrwgdity.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2aGJqaHR0Z3ducGRyd2dkaXR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNTE3MTAsImV4cCI6MjA4NjgyNzcxMH0.oVz7XJ4uNte_jRzYZgSvVMqN_rsrTHDyMdpqLhKNsy0' 

const supabase = createClient(supabaseUrl, supabaseKey)

async function exportData() {
  const tables = ['students', 'profiles', 'grades', 'subjects', 'assignments', 'neighborhoods', 'todos', 'attendance_records', 'academic_periods', 'teacher_invites']
  const results = {}

  for (const table of tables) {
    try {
      console.log(`Exporting: ${table}...`)
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
         console.log(`Failed ${table}: ${error.message}`)
         continue
      }
      results[table] = data
      console.log(`Success ${table}: ${data.length} records`)
    } catch (e) {
      console.log(`Error ${table}: ${e.message}`)
    }
  }

  fs.writeFileSync('full_export.json', JSON.stringify(results, null, 2))
  console.log('Saved to full_export.json')
}

exportData()
