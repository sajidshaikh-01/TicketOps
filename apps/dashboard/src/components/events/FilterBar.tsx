import { Stack, TextField, MenuItem, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
}

export function FilterBar({ search, onSearchChange, category, onCategoryChange, categories }: FilterBarProps) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mb: 4 }}>
      <TextField
        placeholder="Search events, artists, venues..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        fullWidth
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <TextField
        select
        label="Category"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        sx={{ minWidth: 180 }}
      >
        <MenuItem value="">All categories</MenuItem>
        {categories.map((c) => (
          <MenuItem key={c} value={c}>
            {c}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
