import { useState } from 'react';
import { Container, Typography, Box, CircularProgress, Alert, Pagination, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { eventsService } from '../../api/events.service';
import { FilterBar } from '../../components/events/FilterBar';
import { EventGrid } from '../../components/events/EventGrid';

export function EventsBrowsePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data: categories = [] } = useQuery({
    queryKey: ['events', 'categories'],
    queryFn: eventsService.listCategories,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', 'list', { search, category, page }],
    queryFn: () => eventsService.list({ search: search || undefined, category: category || undefined, page, pageSize: 9 }),
  });

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h3" fontWeight={700} sx={{ mb: 1 }}>
        Browse events
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Pick something happening near you, or search for what you're after.
      </Typography>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        category={category}
        onCategoryChange={(v) => {
          setCategory(v);
          setPage(1);
        }}
        categories={categories}
      />

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {isError && <Alert severity="error">Couldn't load events right now. Please try again shortly.</Alert>}
      {data && (
        <>
          <EventGrid events={data.items} />
          {data.totalPages > 1 && (
            <Stack direction="row" justifyContent="center" sx={{ mt: 5 }}>
              <Pagination count={data.totalPages} page={page} onChange={(_, value) => setPage(value)} color="primary" />
            </Stack>
          )}
        </>
      )}
    </Container>
  );
}
