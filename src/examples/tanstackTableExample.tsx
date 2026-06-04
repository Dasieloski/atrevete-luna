import { useMemo } from 'react';
import { useTanStackTable, flexRender, getCoreRowModel } from '@tanstack/react-table';

// Example data
const sampleData = useMemo(
  () => [
    { id: 1, name: 'Alice Smith', age: 28, email: 'alice@example.com', status: 'active' },
    { id: 2, name: 'Bob Johnson', age: 34, email: 'bob@example.com', status: 'inactive' },
    { id: 3, name: 'Carol Davis', age: 22, email: 'carol@example.com', status: 'pending' },
    { id: 4, name: 'David Wilson', age: 45, email: 'david@example.com', status: 'active' },
    { id: 5, name: 'Eve Brown', age: 31, email: 'eve@example.com', status: 'inactive' },
  ],
  []
);

// Column definitions
const columns = useMemo(
  () => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 60,
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'age',
      header: 'Age',
      size: 60,
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 80,
      cell: ({ row }) => {
        const status = row.getValue('status');
        return (
          <span className={`status-badge status-${status}`}>
            {status}
          </span>
        );
      },
    },
  ],
  []
);

// Create the table instance
const table = useTanStackTable({
  data: sampleData,
  columns,
  getCoreRowModel: getCoreRowModel(),
});

export { table, sampleData };