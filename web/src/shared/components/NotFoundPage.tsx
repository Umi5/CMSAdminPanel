import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from './StateViews';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <EmptyState
      title="Page not found"
      description="That page doesn’t exist."
      action={
        <Button variant="contained" onClick={() => navigate('/schemas')}>
          Back to content types
        </Button>
      }
    />
  );
}
