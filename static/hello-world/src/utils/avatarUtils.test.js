import { avatarSheetLayout, withAvatarSize } from './avatarUtils';

describe('avatarUtils', () => {
  describe('withAvatarSize', () => {
    it('should override every size param Jira sets', () => {
      expect(
        withAvatarSize(
          'https://avatars.example.net/initials/MK-5.png?size=48&s=48',
          256
        )
      ).toBe('https://avatars.example.net/initials/MK-5.png?size=256&s=256');
    });

    it('should override the gravatar size param', () => {
      expect(
        withAvatarSize('https://secure.gravatar.com/avatar/abc?s=48&d=mm', 256)
      ).toBe('https://secure.gravatar.com/avatar/abc?s=256&d=mm');
    });

    it('should add a size param when the url has none', () => {
      expect(withAvatarSize('https://avatars.example.net/abc/def', 256)).toBe(
        'https://avatars.example.net/abc/def?size=256'
      );
    });

    it('should return null when there is no url', () => {
      expect(withAvatarSize(null, 256)).toBeNull();
      expect(withAvatarSize(undefined, 256)).toBeNull();
    });
  });

  describe('avatarSheetLayout', () => {
    it('should lay avatars out in a near-square grid', () => {
      expect(avatarSheetLayout(1)).toEqual({ columns: 1, rows: 1 });
      expect(avatarSheetLayout(4)).toEqual({ columns: 2, rows: 2 });
      expect(avatarSheetLayout(5)).toEqual({ columns: 3, rows: 2 });
      expect(avatarSheetLayout(10)).toEqual({ columns: 4, rows: 3 });
    });

    it('should have no dimensions when there is nothing to lay out', () => {
      expect(avatarSheetLayout(0)).toEqual({ columns: 0, rows: 0 });
    });
  });
});
