import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { NoteComposer } from './note-composer';

describe('NoteComposer', () => {
  test('Save sends the trimmed text and clears the box on success', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<NoteComposer onSave={onSave} />);
    const box = screen.getByPlaceholderText("What's on your mind?");
    fireEvent.change(box, { target: { value: '  Call mom  ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(onSave).toHaveBeenCalledWith('Call mom');
    expect(box).toHaveValue('');
  });

  test('Ctrl+Enter and Cmd+Enter save; plain Enter does not', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<NoteComposer onSave={onSave} />);
    const box = screen.getByPlaceholderText("What's on your mind?");
    fireEvent.change(box, { target: { value: 'one' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSave).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    });
    expect(onSave).toHaveBeenCalledWith('one');
    fireEvent.change(box, { target: { value: 'two' } });
    await act(async () => {
      fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
    });
    expect(onSave).toHaveBeenLastCalledWith('two');
  });

  test('blank text does nothing', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<NoteComposer onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), { target: { value: '   ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(onSave).not.toHaveBeenCalled();
  });

  test('keeps the text when the save fails', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    render(<NoteComposer onSave={onSave} />);
    const box = screen.getByPlaceholderText("What's on your mind?");
    fireEvent.change(box, { target: { value: 'keep me' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(box).toHaveValue('keep me');
  });
});
