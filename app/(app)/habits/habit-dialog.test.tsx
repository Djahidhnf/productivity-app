import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { HabitDialog, type HabitDialogValues } from './habit-dialog';

const baseValues: HabitDialogValues = { name: '', freqType: 'DAILY', timesPerWeek: '3', startDate: '2026-09-23' };

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
    expect(onSave).toHaveBeenCalledWith({ name: 'Stretch', freqType: 'DAILY', timesPerWeek: '3', startDate: '2026-09-23' });
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

  test('resets its fields when a new initialValues object is passed in', () => {
    const { rerender } = render(<HabitDialog open mode="edit" initialValues={baseValues} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Habit name'), { target: { value: 'Changed' } });
    rerender(<HabitDialog open mode="edit" initialValues={{ ...baseValues, name: 'Read' }} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Habit name')).toHaveValue('Read');
  });
});
