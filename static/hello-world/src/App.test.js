import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { view, requestJira } from '@forge/bridge';
import App from './App';

jest.mock('./utils/mentionUtils', () => ({
  findMentions: jest.fn(),
}));

import { findMentions } from './utils/mentionUtils';

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigator.clipboard.writeText.mockClear();
  });

  it('shows loading state initially', () => {
    view.getContext.mockImplementation(() => new Promise(() => {}));
    render(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders tabs for names, emails, and avatars', async () => {
    view.getContext.mockResolvedValue({
      extension: { selectedText: 'Hello @john' },
    });
    findMentions.mockReturnValue(['john']);
    requestJira.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ displayName: 'John Doe', emailAddress: 'john@example.com', avatarUrls: { '48x48': 'https://example.com/a.png' } }]),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Full names')).toBeInTheDocument();
      expect(screen.getByText('Emails')).toBeInTheDocument();
      expect(screen.getByText('Avatar images')).toBeInTheDocument();
    });

    expect(screen.getByText('@john: John Doe')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Emails'));
    expect(screen.getByText('@john: john@example.com')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Avatar images'));
    expect(screen.getByAltText('John Doe avatar')).toBeInTheDocument();
  });

  it('copies emails from the emails tab', async () => {
    view.getContext.mockResolvedValue({
      extension: { selectedText: 'Hello @john and @jane' },
    });
    findMentions.mockReturnValue(['john', 'jane']);
    requestJira
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ displayName: 'John Doe', emailAddress: 'john@example.com', avatarUrls: {} }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ displayName: 'Jane Doe', emailAddress: 'jane@example.com', avatarUrls: {} }]),
      });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Emails')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Emails'));
    fireEvent.click(screen.getByText('Copy Email Addresses'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('john@example.com\njane@example.com');
      expect(screen.getByText('✓ Copied to clipboard!')).toBeInTheDocument();
    });
  });

  it('shows error state when context lookup fails', async () => {
    view.getContext.mockRejectedValue(new Error('Failed to get context'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to get context')).toBeInTheDocument();
    });
  });
});
