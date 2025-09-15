-- Check if there's a constraint on question types
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'questions'::regclass
AND contype = 'c';

-- Also check the questions table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'questions'
ORDER BY ordinal_position;