import React from 'react';
import { TouchableHighlight, View, Text, StyleSheet } from 'react-native';

interface MobileButtonProps {
  onPress: () => void;
  title: string;
  color?: string;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  onPress,
  title,
  color = '#007AFF',
}) => {
  return (
    <TouchableHighlight
      style={[styles.button, { backgroundColor: color }]}
      onPress={onPress}
      underlayColor={color + '99'}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableHighlight>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});