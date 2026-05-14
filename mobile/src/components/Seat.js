import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius, fontSize } from '../theme';

const typeColor = {
  STANDARD: colors.seatAvailable,
  VIP: colors.seatVIP,
  COUPLE: colors.seatCouple,
  SWEETBOX: colors.seatSweetbox,
  DISABLED: colors.seatDisabled,
};

export default function Seat({ seat, selected, onPress }) {
  const isBooked = seat.status === 'booked';
  const isDouble = seat.capacity === 2;
  const bg = isBooked
    ? colors.seatBooked
    : selected
    ? colors.seatSelected
    : typeColor[seat.seat_type_code] || colors.seatAvailable;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isBooked}
      onPress={() => onPress(seat)}
      style={[
        styles.seat,
        { backgroundColor: bg, width: isDouble ? 52 : 24, opacity: isBooked ? 0.35 : 1 },
        selected && styles.selected,
      ]}
    >
      <Text style={[styles.text, selected && { color: '#fff' }]}>
        {seat.row_label}{seat.column_number}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  seat: {
    height: 24,
    margin: 3,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selected: { borderWidth: 2, borderColor: '#fff' },
  text: { color: colors.text, fontSize: 9, fontWeight: '600' },
});
