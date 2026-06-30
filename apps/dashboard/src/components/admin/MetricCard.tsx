import { Card, CardContent, Typography, Stack, Box } from '@mui/material';
import type { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  accentColor?: string;
}

export function MetricCard({ label, value, icon, accentColor = '#6C5CE7' }: MetricCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${accentColor}1A`,
              color: accentColor,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
