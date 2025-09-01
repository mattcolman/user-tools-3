import { findMentions, isValidMention, getUniqueMentions } from './mentionUtils';

describe('mentionUtils', () => {
  describe('findMentions', () => {
    it('should find single mention in text', () => {
      const text = 'Hello @john, how are you?';
      const result = findMentions(text);
      expect(result).toEqual(['john']);
    });

    it('should find multiple mentions in text', () => {
      const text = 'Meeting with @john and @jane tomorrow';
      const result = findMentions(text);
      expect(result).toEqual(['john', 'jane']);
    });

    it('should find mentions with spaces in names', () => {
      const text = 'Please contact @John Smith and @Jane Doe';
      const result = findMentions(text);
      // Note: Current implementation captures single words due to space handling
      // This matches the original App.js behavior where spaces in names need special handling
      expect(result).toEqual(['John', 'Jane']);
    });

    it('should handle mentions at the beginning of text', () => {
      const text = '@admin please review this';
      const result = findMentions(text);
      expect(result).toEqual(['admin']);
    });

    it('should handle mentions at the end of text', () => {
      const text = 'Thanks for the help @support';
      const result = findMentions(text);
      expect(result).toEqual(['support']);
    });

    it('should handle multiple mentions with same name', () => {
      const text = '@john said hi. @john is great!';
      const result = findMentions(text);
      expect(result).toEqual(['john', 'john']);
    });

    it('should return empty array for text without mentions', () => {
      const text = 'This is just regular text';
      const result = findMentions(text);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = findMentions('');
      expect(result).toEqual([]);
    });

    it('should return empty array for null or undefined', () => {
      expect(findMentions(null)).toEqual([]);
      expect(findMentions(undefined)).toEqual([]);
    });

    it('should handle mentions with special characters in text', () => {
      const text = 'Email @user.name about the issue!';
      const result = findMentions(text);
      expect(result).toEqual(['user.name']);
    });

    it('should not match email addresses', () => {
      const text = 'Send email to user@example.com';
      const result = findMentions(text);
      expect(result).toEqual([]);
    });
  });

  describe('isValidMention', () => {
    it('should return true for valid mentions', () => {
      expect(isValidMention('@john')).toBe(true);
      expect(isValidMention('@John Smith')).toBe(true);
      expect(isValidMention('@user.name')).toBe(true);
    });

    it('should return false for invalid mentions', () => {
      expect(isValidMention('john')).toBe(false); // missing @
      expect(isValidMention('@')).toBe(false); // @ only
      expect(isValidMention('@@john')).toBe(false); // double @
      expect(isValidMention('@john@')).toBe(false); // @ at end
    });

    it('should return false for null, undefined, or non-string input', () => {
      expect(isValidMention(null)).toBe(false);
      expect(isValidMention(undefined)).toBe(false);
      expect(isValidMention(123)).toBe(false);
      expect(isValidMention({})).toBe(false);
    });
  });

  describe('getUniqueMentions', () => {
    it('should return unique mentions only', () => {
      const text = '@john said hi. @jane replied. @john agreed.';
      const result = getUniqueMentions(text);
      expect(result).toEqual(['john', 'jane']);
    });

    it('should handle text with no duplicates', () => {
      const text = '@alice and @bob are here';
      const result = getUniqueMentions(text);
      expect(result).toEqual(['alice', 'bob']);
    });

    it('should return empty array for text without mentions', () => {
      const text = 'No mentions here';
      const result = getUniqueMentions(text);
      expect(result).toEqual([]);
    });
  });
});