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

    it('should display error when clipboard write fails', async () => {
      // Setup successful context and user lookup
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
      });

      // Mock clipboard failure
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Hello @john')).toBeInTheDocument();
      });

      const copyButton = screen.getByText('Copy All (One per line)');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('Error: Failed to copy emails to clipboard')).toBeInTheDocument();
      });
    });
  });

  describe('Successful Flow', () => {
    it('should display selected text and found users', async () => {
      const selectedText = 'Meeting with @john and @jane tomorrow';
      view.getContext.mockResolvedValue({
        extension: { selectedText }
      });
      findMentions.mockReturnValue(['john', 'jane']);
      
      // Mock successful user lookups
      requestJira
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ emailAddress: 'jane@example.com' }])
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

    it('should not display Found Users section when no mentions found', async () => {
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
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
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
        json: () => Promise.resolve([{ emailAddress: 'john.doe@example.com' }])
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

  describe('Tab Navigation', () => {
    it('should have Mentions and Copy Emails tabs', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Mentions')).toBeInTheDocument();
        expect(screen.getByText('Copy Emails')).toBeInTheDocument();
      });
    });

    it('should show Mentions tab by default', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Selected Text:')).toBeInTheDocument();
        expect(screen.getByText('Found Users:')).toBeInTheDocument();
      });
    });

    it('should switch to Copy Emails tab when clicked', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Mentions')).toBeInTheDocument();
      });

      const copyEmailsTab = screen.getByText('Copy Emails');
      fireEvent.click(copyEmailsTab);

      await waitFor(() => {
        expect(screen.getByText('User Emails')).toBeInTheDocument();
        expect(screen.getByText('Found 1 user email')).toBeInTheDocument();
      });
    });

    it('should switch back to Mentions tab', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Emails')).toBeInTheDocument();
      });

      const copyEmailsTab = screen.getByText('Copy Emails');
      fireEvent.click(copyEmailsTab);

      await waitFor(() => {
        expect(screen.getByText('User Emails')).toBeInTheDocument();
      });

      const mentionsTab = screen.getByText('Mentions');
      fireEvent.click(mentionsTab);

      await waitFor(() => {
        expect(screen.getByText('Selected Text:')).toBeInTheDocument();
      });
    });
  });

  describe('Copy Functionality', () => {
    it('should copy emails to clipboard (newline format) and show success message', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john and @jane' }
      });
      findMentions.mockReturnValue(['john', 'jane']);
      requestJira
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ emailAddress: 'jane@example.com' }])
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy All (One per line)')).toBeInTheDocument();
      });

      const copyButton = screen.getByText('Copy All (One per line)');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('john@example.com\njane@example.com');
        expect(screen.getByText('✓ Copied to clipboard!')).toBeInTheDocument();
      });
    });

    it('should copy emails in comma-separated format from Copy Emails tab', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john and @jane' }
      });
      findMentions.mockReturnValue(['john', 'jane']);
      requestJira
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ emailAddress: 'jane@example.com' }])
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Emails')).toBeInTheDocument();
      });

      const copyEmailsTab = screen.getByText('Copy Emails');
      fireEvent.click(copyEmailsTab);

      await waitFor(() => {
        expect(screen.getByText('Comma Separated')).toBeInTheDocument();
      });

      const commaButton = screen.getByText('Comma Separated');
      fireEvent.click(commaButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('john@example.com, jane@example.com');
        expect(screen.getByText('✓ Copied to clipboard!')).toBeInTheDocument();
      });
    });

    it('should copy emails in semicolon-separated format', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john and @jane' }
      });
      findMentions.mockReturnValue(['john', 'jane']);
      requestJira
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ emailAddress: 'jane@example.com' }])
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Emails')).toBeInTheDocument();
      });

      const copyEmailsTab = screen.getByText('Copy Emails');
      fireEvent.click(copyEmailsTab);

      await waitFor(() => {
        expect(screen.getByText('Semicolon Separated')).toBeInTheDocument();
      });

      const semicolonButton = screen.getByText('Semicolon Separated');
      fireEvent.click(semicolonButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('john@example.com; jane@example.com');
      });
    });

    it('should copy individual email from Copy Emails tab', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Emails')).toBeInTheDocument();
      });

      const copyEmailsTab = screen.getByText('Copy Emails');
      fireEvent.click(copyEmailsTab);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // Find and click the first Copy button (for individual email)
      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('john@example.com');
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
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy All (One per line)')).toBeInTheDocument();
      });

      const copyButton = screen.getByText('Copy All (One per line)');
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
    it('should have proper heading structure in Mentions tab', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Selected Text:' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 3, name: 'Found Users:' })).toBeInTheDocument();
      });
    });

    it('should render copy button with correct styling in Mentions tab', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
      });

      render(<App />);

      await waitFor(() => {
        const copyButton = screen.getByText('Copy All (One per line)');
        expect(copyButton).toBeInTheDocument();
        expect(copyButton).toHaveStyle({
          backgroundColor: 'rgb(0, 82, 204)',
          color: 'white'
        });
      });
    });

    it('should have proper heading structure in Copy Emails tab', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john' }
      });
      findMentions.mockReturnValue(['john']);
      requestJira.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Emails')).toBeInTheDocument();
      });

      const copyEmailsTab = screen.getByText('Copy Emails');
      fireEvent.click(copyEmailsTab);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'User Emails' })).toBeInTheDocument();
      });
    });

    it('should display email count in Copy Emails tab', async () => {
      view.getContext.mockResolvedValue({
        extension: { selectedText: 'Hello @john and @jane' }
      });
      findMentions.mockReturnValue(['john', 'jane']);
      requestJira
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ emailAddress: 'john@example.com' }])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ emailAddress: 'jane@example.com' }])
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Emails')).toBeInTheDocument();
      });

      const copyEmailsTab = screen.getByText('Copy Emails');
      fireEvent.click(copyEmailsTab);

      await waitFor(() => {
        expect(screen.getByText('Found 2 user emails')).toBeInTheDocument();
      });
    });
  });
});