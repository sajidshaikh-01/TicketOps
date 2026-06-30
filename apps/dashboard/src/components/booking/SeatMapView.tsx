import { Box, Typography, Stack, Tooltip } from '@mui/material';
import { useMemo } from 'react';
import type { Seat } from '../../types';
import { tokens } from '../../theme/tokens';

interface SeatMapProps {
  seats: Seat[];
  selectedSeatCodes: string[];
  onToggleSeat: (seatCode: string) => void;
  maxSelectable: number;
}

function seatColor(status: Seat['status'], isSelected: boolean) {
  if (isSelected) return tokens.color.violet;
  if (status === 'BOOKED') return '#3A3850';
  if (status === 'HELD') return tokens.color.amber;
  return 'transparent';
}

export function SeatMapView({ seats, selectedSeatCodes, onToggleSeat, maxSelectable }: SeatMapProps) {
  const sections = useMemo(() => {
    const grouped = new Map<string, Map<string, Seat[]>>();
    for (const seat of seats) {
      if (!grouped.has(seat.section)) grouped.set(seat.section, new Map());
      const rowLetter = seat.seatCode.replace(/^./, '').match(/^[A-Z]+/)?.[0] ?? '?';
      const sectionRows = grouped.get(seat.section)!;
      if (!sectionRows.has(rowLetter)) sectionRows.set(rowLetter, []);
      sectionRows.get(rowLetter)!.push(seat);
    }
    return grouped;
  }, [seats]);

  const atMax = selectedSeatCodes.length >= maxSelectable;

  return (
    <Box>
      {/* "Stage" indicator orients the whole map */}
      <Box
        sx={{
          mx: 'auto',
          mb: 4,
          width: '70%',
          py: 1,
          textAlign: 'center',
          borderRadius: 2,
          bgcolor: 'action.hover',
          color: 'text.secondary',
          letterSpacing: '0.2em',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
      >
        STAGE
      </Box>

      <Stack gap={4}>
        {Array.from(sections.entries()).map(([sectionName, rows]) => (
          <Box key={sectionName}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {sectionName}
            </Typography>
            <Stack gap={0.75}>
              {Array.from(rows.entries()).map(([rowLetter, rowSeats]) => (
                <Stack key={rowLetter} direction="row" gap={0.75} alignItems="center" justifyContent="center">
                  <Typography variant="caption" color="text.secondary" sx={{ width: 16 }}>
                    {rowLetter}
                  </Typography>
                  {rowSeats.map((seat) => {
                    const isSelected = selectedSeatCodes.includes(seat.seatCode);
                    const isDisabled = seat.status !== 'AVAILABLE' && !isSelected;
                    const isBlockedByMax = !isSelected && atMax;

                    return (
                      <Tooltip
                        key={seat.id}
                        title={`${seat.seatCode} - ${seat.status === 'AVAILABLE' ? 'Available' : seat.status}`}
                      >
                        <Box
                          component="button"
                          disabled={isDisabled || isBlockedByMax}
                          onClick={() => onToggleSeat(seat.seatCode)}
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '6px 6px 10px 10px',
                            border: '1.5px solid',
                            borderColor: isSelected ? tokens.color.violet : 'divider',
                            bgcolor: seatColor(seat.status, isSelected),
                            cursor: isDisabled || isBlockedByMax ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.4 : isBlockedByMax ? 0.6 : 1,
                            transition: 'transform 120ms ease, background-color 120ms ease',
                            '&:hover': !isDisabled && !isBlockedByMax ? { transform: 'translateY(-2px)' } : undefined,
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Stack>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Stack direction="row" justifyContent="center" gap={3} sx={{ mt: 4 }}>
        <LegendItem color="transparent" border label="Available" />
        <LegendItem color={tokens.color.violet} label="Selected" />
        <LegendItem color={tokens.color.amber} label="Held by someone" />
        <LegendItem color="#3A3850" label="Booked" />
      </Stack>
    </Box>
  );
}

function LegendItem({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: '3px',
          bgcolor: color,
          border: border ? '1.5px solid' : 'none',
          borderColor: 'divider',
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}
