import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { view, requestJira, requestConfluence } from '@forge/bridge';
import App from './App';

const pageBody = (mentions) =>
  JSON.stringify({
    type: 'doc',
    version: 1,
    content: mentions.map(({ accountId, text }) => ({
      type: 'paragraph',
      content: [{ type: 'mention', attrs: { id: accountId, text } }],
    })),
  });

const mockPage = (mentions) => {
  requestConfluence.mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        body: { atlas_doc_format: { value: pageBody(mentions) } },
      }),
  });
};

const mockUser = ({ displayName, emailAddress }) => ({
  ok: true,
  json: () =>
    Promise.resolve({
      displayName,
      emailAddress,
      avatarUrls: { '48x48': `https://avatar/${displayName}` },
    }),
});

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigator.clipboard.writeText.mockClear();
    view.getContext.mockResolvedValue({
      extension: { content: { id: '12345' } },
    });
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
      view.getContext.mockRejectedValue(new Error('Failed to get context'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Error: Failed to get context')).toBeInTheDocument();
      });
    });

    it('should display error when the page content cannot be loaded', async () => {
      requestConfluence.mockResolvedValue({ ok: false, status: 404 });

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText('Error: Failed to load page content (404)')
        ).toBeInTheDocument();
      });
    });

    it('should display error when clipboard write fails', async () => {
      mockPage([{ accountId: 'acc-1', text: '@John Smith' }]);
      requestJira.mockResolvedValue(
        mockUser({ displayName: 'John Smith', emailAddress: 'john@example.com' })
      );
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Email Addresses')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Copy Email Addresses'));

      await waitFor(() => {
        expect(
          screen.getByText('Error: Failed to copy emails to clipboard')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Successful Flow', () => {
    it('should display every mentioned user with their email', async () => {
      mockPage([
        { accountId: 'acc-1', text: '@John Smith' },
        { accountId: 'acc-2', text: '@Jane Doe' },
      ]);
      requestJira
        .mockResolvedValueOnce(
          mockUser({ displayName: 'John Smith', emailAddress: 'john@example.com' })
        )
        .mockResolvedValueOnce(
          mockUser({ displayName: 'Jane Doe', emailAddress: 'jane@example.com' })
        );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Smith: john@example.com')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe: jane@example.com')).toBeInTheDocument();
      });
    });

    it('should tell the user when the page has no mentions', async () => {
      mockPage([]);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('No @mentions found on this page.')).toBeInTheDocument();
      });
      expect(requestJira).not.toHaveBeenCalled();
    });

    it('should fall back to the mention text when the lookup fails', async () => {
      mockPage([{ accountId: 'acc-1', text: '@John Smith' }]);
      requestJira.mockResolvedValue({ ok: false, status: 403 });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });
      expect(screen.getByText('Copy Email Addresses')).toBeDisabled();
    });
  });

  describe('User Lookup', () => {
    it('should request the page body as ADF', async () => {
      mockPage([]);

      render(<App />);

      await waitFor(() => {
        expect(requestConfluence).toHaveBeenCalledWith(
          '/wiki/api/v2/pages/12345?body-format=atlas_doc_format'
        );
      });
    });

    it('should look users up by account id rather than by name', async () => {
      mockPage([{ accountId: 'acc:1/2', text: '@John Smith' }]);
      requestJira.mockResolvedValue(
        mockUser({ displayName: 'John Smith', emailAddress: 'john@example.com' })
      );

      render(<App />);

      await waitFor(() => {
        expect(requestJira).toHaveBeenCalledWith(
          '/rest/api/3/user?accountId=acc%3A1%2F2'
        );
      });
    });
  });

  describe('Copy Functionality', () => {
    it('should copy emails to clipboard and show success message', async () => {
      mockPage([
        { accountId: 'acc-1', text: '@John Smith' },
        { accountId: 'acc-2', text: '@Jane Doe' },
      ]);
      requestJira
        .mockResolvedValueOnce(
          mockUser({ displayName: 'John Smith', emailAddress: 'john@example.com' })
        )
        .mockResolvedValueOnce(
          mockUser({ displayName: 'Jane Doe', emailAddress: 'jane@example.com' })
        );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Email Addresses')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Copy Email Addresses'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'john@example.com\njane@example.com'
        );
        expect(screen.getByText('✓ Copied to clipboard!')).toBeInTheDocument();
      });
    });

    it('should hide success message after timeout', async () => {
      jest.useFakeTimers();

      mockPage([{ accountId: 'acc-1', text: '@John Smith' }]);
      requestJira.mockResolvedValue(
        mockUser({ displayName: 'John Smith', emailAddress: 'john@example.com' })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Email Addresses')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Copy Email Addresses'));

      await waitFor(() => {
        expect(screen.getByText('✓ Copied to clipboard!')).toBeInTheDocument();
      });

      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.queryByText('✓ Copied to clipboard!')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Component Structure', () => {
    it('should have proper heading structure', async () => {
      mockPage([{ accountId: 'acc-1', text: '@John Smith' }]);
      requestJira.mockResolvedValue(
        mockUser({ displayName: 'John Smith', emailAddress: 'john@example.com' })
      );

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: 'Mentioned Users' })
        ).toBeInTheDocument();
      });
    });

    it('should render copy button with correct styling', async () => {
      mockPage([{ accountId: 'acc-1', text: '@John Smith' }]);
      requestJira.mockResolvedValue(
        mockUser({ displayName: 'John Smith', emailAddress: 'john@example.com' })
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Copy Email Addresses')).toHaveStyle({
          backgroundColor: 'rgb(0, 82, 204)',
          color: 'white',
        });
      });
    });
  });
});
