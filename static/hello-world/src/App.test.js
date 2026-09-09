import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { view, requestJira, requestConfluence } from '@forge/bridge';
import { copyAvatarsToClipboard, downloadAvatarSheet } from './utils/avatarUtils';
import App from './App';

jest.mock('./utils/avatarUtils', () => ({
  ...jest.requireActual('./utils/avatarUtils'),
  copyAvatarsToClipboard: jest.fn(),
  downloadAvatarSheet: jest.fn(),
}));

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
      avatarUrls: { '48x48': `https://avatars.example.net/${displayName}?size=48` },
    }),
});

const mockTwoUsers = () => {
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
};

const button = (name) => screen.getByRole('button', { name });

const waitForGrid = () =>
  waitFor(() => {
    expect(screen.getByRole('button', { name: 'Copy avatars' })).toBeInTheDocument();
  });

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigator.clipboard.writeText.mockClear();
    navigator.clipboard.writeText.mockResolvedValue(undefined);
    copyAvatarsToClipboard.mockResolvedValue(undefined);
    downloadAvatarSheet.mockResolvedValue(undefined);
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

    it('should report a clipboard failure without hiding the grid', async () => {
      mockTwoUsers();
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));

      render(<App />);
      await waitForGrid();

      fireEvent.click(button('Copy email addresses'));

      await waitFor(() => {
        expect(
          screen.getByText('Failed to copy emails to clipboard')
        ).toBeInTheDocument();
      });
      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
    });
  });

  describe('Successful Flow', () => {
    it('should show a card per mentioned user, all selected by default', async () => {
      mockTwoUsers();

      render(<App />);
      await waitForGrid();

      expect(screen.getAllByText('John Smith').length).toBeGreaterThan(0);
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
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
      await waitForGrid();

      expect(screen.getAllByText('John Smith').length).toBeGreaterThan(0);
      expect(screen.getByText('No email available')).toBeInTheDocument();
      expect(button('Copy avatars')).toBeDisabled();
      expect(button('Copy email addresses')).toBeDisabled();
    });

    it('should request the page body as ADF and look users up by account id', async () => {
      mockPage([{ accountId: 'acc:1/2', text: '@John Smith' }]);
      requestJira.mockResolvedValue(
        mockUser({ displayName: 'John Smith', emailAddress: 'john@example.com' })
      );

      render(<App />);
      await waitForGrid();

      expect(requestConfluence).toHaveBeenCalledWith(
        '/wiki/api/v2/pages/12345?body-format=atlas_doc_format'
      );
      expect(requestJira).toHaveBeenCalledWith(
        '/rest/api/3/user?accountId=acc%3A1%2F2'
      );
    });
  });

  describe('Selection', () => {
    it('should exclude a user from actions when unchecked', async () => {
      mockTwoUsers();

      render(<App />);
      await waitForGrid();

      fireEvent.click(screen.getByLabelText('Include Jane Doe'));

      expect(screen.getByText('1 of 2 selected')).toBeInTheDocument();

      fireEvent.click(button('Copy email addresses'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('john@example.com');
      });
    });

    it('should support select none and select all', async () => {
      mockTwoUsers();

      render(<App />);
      await waitForGrid();

      fireEvent.click(button('Select none'));
      expect(screen.getByText('0 of 2 selected')).toBeInTheDocument();
      expect(button('Copy avatars')).toBeDisabled();

      fireEvent.click(button('Select all'));
      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      expect(button('Select all')).toBeDisabled();
    });
  });

  describe('Copy Functionality', () => {
    it('should copy the selected emails', async () => {
      mockTwoUsers();

      render(<App />);
      await waitForGrid();

      fireEvent.click(button('Copy email addresses'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'john@example.com\njane@example.com'
        );
        expect(screen.getByText('✓ Copied email addresses')).toBeInTheDocument();
      });
    });

    it('should copy the selected avatars at export size', async () => {
      mockTwoUsers();

      render(<App />);
      await waitForGrid();

      fireEvent.click(button('Copy avatars'));

      await waitFor(() => {
        expect(copyAvatarsToClipboard).toHaveBeenCalledWith(
          [
            'https://avatars.example.net/John%20Smith?size=256',
            'https://avatars.example.net/Jane%20Doe?size=256',
          ],
          { size: 256 }
        );
        expect(
          screen.getByText('✓ Copied avatars — paste them into Figma')
        ).toBeInTheDocument();
      });
    });

    it('should fall back to copying avatar urls when the image copy fails', async () => {
      mockTwoUsers();
      copyAvatarsToClipboard.mockRejectedValue(new Error('not supported'));

      render(<App />);
      await waitForGrid();

      fireEvent.click(button('Copy avatars'));

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          'https://avatars.example.net/John%20Smith?size=256\nhttps://avatars.example.net/Jane%20Doe?size=256'
        );
        expect(
          screen.getByText("Couldn't copy the images, copied avatar URLs instead")
        ).toBeInTheDocument();
      });
    });

    it('should download the selected avatars as a sheet', async () => {
      mockTwoUsers();

      render(<App />);
      await waitForGrid();

      fireEvent.click(button('Download avatars'));

      await waitFor(() => {
        expect(downloadAvatarSheet).toHaveBeenCalledWith(
          [
            'https://avatars.example.net/John%20Smith?size=256',
            'https://avatars.example.net/Jane%20Doe?size=256',
          ],
          { size: 256 }
        );
        expect(screen.getByText('✓ Downloaded avatars.png')).toBeInTheDocument();
      });
    });

    it('should keep the grid when a download fails', async () => {
      mockTwoUsers();
      downloadAvatarSheet.mockRejectedValue(new Error('canvas blocked'));

      render(<App />);
      await waitForGrid();

      fireEvent.click(button('Download avatars'));

      await waitFor(() => {
        expect(screen.getByText('Failed to download avatars')).toBeInTheDocument();
      });
      expect(screen.getByText('2 of 2 selected')).toBeInTheDocument();
      expect(button('Download avatars')).toBeEnabled();
    });

    it('should hide the status message after a timeout', async () => {
      jest.useFakeTimers();
      mockTwoUsers();

      render(<App />);
      await waitForGrid();

      fireEvent.click(button('Copy email addresses'));

      await waitFor(() => {
        expect(screen.getByText('✓ Copied email addresses')).toBeInTheDocument();
      });

      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.queryByText('✓ Copied email addresses')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
});
