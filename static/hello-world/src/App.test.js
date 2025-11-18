import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { view, requestJira } from '@forge/bridge';
import App from './App';

// Mock the utility module
jest.mock('./utils/mentionUtils', () => ({
  findMentions: jest.fn()
}));

import { findMentions } from './utils/mentionUtils';

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset clipboard mock
    navigator.clipboard.writeText.mockClear();
  });

  describe('Loading State', () => {
    it('should show loading message initially', () => {
      view.getContext.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<App />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error when getContext fails', async () => {
      const errorMessage = 'Failed to get context';
      view.getContext.mockRejectedValue(new Error(errorMessage));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Flow', () => {
    it('should display selected text and found users in Emails tab', async () => {
      const selectedText = 'Meeting with @john and @jane tomorrow';
      view.getContext.mockResolvedValue({
        extension: { selectedText }
      });
      findMentions.mockReturnValue(['john', 'jane']);

      // Mock successful user lookups with full user objects
      requestJira
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{
            emailAddress: 'john@example.com',
            avatarUrls: { '32x32': 'http://example.com/avatar/john.jpg' }
          }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{
            emailAddress: 'jane@example.com',
            avatarUrls: { '32x32': 'http://example.com/avatar/jane.jpg' }
          }])
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Selected Text:')).toBeInTheDocument();
        expect(screen.getByText(selectedText)).toBeInTheDocument();
        expect(screen.getByText('Found Users:')).toBeInTheDocument();
        expect(screen.getByText('@john: john@example.com')).toBeInTheDocument();
        expect(screen.getByText('@jane: jane@example.com')).toBeInTheDocument();
      });
    });

    it('should not display users section when no mentions found', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'No mentions in this text' }
      });
      findMentions.mockReturnValue([]);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('No mentions in this text')).toBeInTheDocument();
        expect(screen.queryByText('Found Users:')).not.toBeInTheDocument();
      });
    });

    it('should handle users not found in lookup', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @unknown' }
      });
      findMentions.mockReturnValue(['unknown']);

      // Mock user not found
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]) // Empty array means user not found
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Hello @unknown')).toBeInTheDocument();
        expect(screen.queryByText('Found Users:')).not.toBeInTheDocument();
      });
    });
  });

  describe('User Lookup', () => {
    it('should call requestJira with correct parameters', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          emailAddress: 'john@example.com',
          avatarUrls: { '32x32': 'http://example.com/avatar/john.jpg' }
        }])
      });

      render(<App />);

      await waitFor(() => {
        expect(requestJira).toHaveBeenCalledWith('/rest/api/3/user/search?query=john');
      });
    });

    it('should handle special characters in user names', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john.doe' }
      });
      findMentions.mockReturnValue(['john.doe']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          emailAddress: 'john.doe@example.com',
          avatarUrls: { '32x32': 'http://example.com/avatar/john.jpg' }
        }])
      });

      render(<App />);

      await waitFor(() => {
        expect(requestJira).toHaveBeenCalledWith('/rest/api/3/user/search?query=john.doe');
      });
    });

    it('should handle API request failure gracefully', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: false
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Hello @john')).toBeInTheDocument();
        expect(screen.queryByText('Found Users:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Copy Functionality', () => {
    it('should copy emails to clipboard and show success message', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john and @jane' }
      });
      findMentions.mockReturnValue(['john', 'jane']);
      requestJira
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{
            emailAddress: 'john@example.com',
            avatarUrls: { '32x32': 'http://example.com/avatar/john.jpg' }
          }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{
            emailAddress: 'jane@example.com',
            avatarUrls: { '32x32': 'http://example.com/avatar/jane.jpg' }
          }])
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Email Addresses')).toBeInTheDocument();
      });

      const copyButton = screen.getByText('Copy Email Addresses');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('john@example.com\njane@example.com');
        expect(screen.getByText('✓ Copied to clipboard!')).toBeInTheDocument();
      });
    });

    it('should hide success message after timeout', async () => {
      jest.useFakeTimers();

      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          emailAddress: 'john@example.com',
          avatarUrls: { '32x32': 'http://example.com/avatar/john.jpg' }
        }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Email Addresses')).toBeInTheDocument();
      });

      const copyButton = screen.getByText('Copy Email Addresses');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('✓ Copied to clipboard!')).toBeInTheDocument();
      });

      // Fast forward time
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.queryByText('✓ Copied to clipboard!')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Component Structure', () => {
    it('should have proper heading structure', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          emailAddress: 'john@example.com',
          avatarUrls: { '32x32': 'http://example.com/avatar/john.jpg' }
        }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Selected Text:' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3, name: 'Found Users:' })).toBeInTheDocument();
      });
    });

    it('should render copy button with correct styling', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          emailAddress: 'john@example.com',
          avatarUrls: { '32x32': 'http://example.com/avatar/john.jpg' }
        }])
      });

      render(<App />);

      await waitFor(() => {
        const copyButton = screen.getByText('Copy Email Addresses');
        expect(copyButton).toBeInTheDocument();
        expect(copyButton).toHaveStyle({
          backgroundColor: 'rgb(0, 82, 204)',
          color: 'white'
        });
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should display tabs when users are found', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          emailAddress: 'john@example.com',
          avatarUrls: { '32x32': 'http://example.com/avatar/john.jpg' }
        }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Emails')).toBeInTheDocument();
        expect(screen.getByText('Avatars')).toBeInTheDocument();
      });
    });

    it('should switch to avatars tab when clicked', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          emailAddress: 'john@example.com',
          avatarUrls: { '32x32': 'http://example.com/avatar/john.jpg' }
        }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Emails')).toBeInTheDocument();
      });

      const avatarsTab = screen.getByText('Avatars');
      fireEvent.click(avatarsTab);

      await waitFor(() => {
        expect(screen.getByText('User Avatars:')).toBeInTheDocument();
        expect(screen.getByText('Copy Avatar URLs')).toBeInTheDocument();
      });
    });

    it('should switch back to emails tab when clicked', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          emailAddress: 'john@example.com',
          avatarUrls: { '32x32': 'http://example.com/avatar/john.jpg' }
        }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Emails')).toBeInTheDocument();
      });

      // Switch to avatars
      const avatarsTab = screen.getByText('Avatars');
      fireEvent.click(avatarsTab);

      await waitFor(() => {
        expect(screen.getByText('User Avatars:')).toBeInTheDocument();
      });

      // Switch back to emails
      const emailsTab = screen.getByText('Emails');
      fireEvent.click(emailsTab);

      await waitFor(() => {
        expect(screen.getByText('Found Users:')).toBeInTheDocument();
      });
    });
  });
});