import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { HabitDialog, type HabitDialogValues } from './habit-dialog';

const baseValues: HabitDialogValues = {
  name: '',
  freqType: 'DAILY',
  timesPerWeek: '3',
  startDate: '2026-09-23',
  time: '',
  reminderOffset: null,
  reminderDays: 0b1111111,
};

describe('HabitDialog', () => {
  test('does not render when closed', () => {
    render(<HabitDialog open={false} mode="create" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('shows "Times per week" only when frequency is Weekly', () => {
    render(<HabitDialog open mode="create" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.queryByLabelText('Times per week')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Weekly' }));
    expect(screen.getByLabelText('Times per week')).toBeInTheDocument();
  });

  test('calls onSave with the current field values on submit', () => {
    const onSave = vi.fn();
    render(<HabitDialog open mode="create" initialValues={baseValues} onClose={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Stretch' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    expect(onSave).toHaveBeenCalledWith({ ...baseValues, name: 'Stretch' });
  });

  test('shows Delete only in edit mode, and calls onDelete', () => {
    const onDelete = vi.fn();
    const { rerender } = render(<HabitDialog open mode="create" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} onDelete={onDelete} />);
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    rerender(<HabitDialog open mode="edit" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalled();
  });

  test('does not call onSave when the name is blank', () => {
    const onSave = vi.fn();
    render(<HabitDialog open mode="create" initialValues={baseValues} onClose={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  test('disables Save (and blocks submit) while saving is true, preventing a double-submit', () => {
    const onSave = vi.fn();
    render(<HabitDialog open mode="create" initialValues={{ ...baseValues, name: 'Stretch' }} saving onClose={vi.fn()} onSave={onSave} />);
    const saveButton = screen.getByRole('button', { name: 'Saving…' });
    expect(saveButton).toBeDisabled();
    fireEvent.click(saveButton);
    expect(onSave).not.toHaveBeenCalled();
  });

  test('the reminder is disabled until a time is set, then saves the chosen offset', () => {
    const onSave = vi.fn();
    render(<HabitDialog open mode="create" initialValues={{ ...baseValues, name: 'Stretch' }} onClose={vi.fn()} onSave={onSave} />);
    expect(screen.getByLabelText('Reminder')).toBeDisabled();
    expect(screen.getByText('Set a time to get a reminder')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '07:30' } });
    fireEvent.change(screen.getByLabelText('Reminder'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ time: '07:30', reminderOffset: 30 }));
  });

  test('weekly habits with a reminder need at least one reminder day', () => {
    const onSave = vi.fn();
    render(
      <HabitDialog
        open
        mode="edit"
        initialValues={{ ...baseValues, name: 'Run', freqType: 'WEEKLY', time: '18:00', reminderOffset: 0, reminderDays: 0b0000001 }}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    const monday = screen.getByRole('button', { name: 'Monday' });
    expect(monday).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(monday);
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one day.');
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Friday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save habit' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ reminderDays: 0b0010000 }));
  });

  test('resets its fields when a new initialValues object is passed in', () => {
    const { rerender } = render(<HabitDialog open mode="edit" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Changed' } });
    rerender(<HabitDialog open mode="edit" initialValues={{ ...baseValues, name: 'Read' }} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Habit name')).toHaveValue('Read');
  });
});
