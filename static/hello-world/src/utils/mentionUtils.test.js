import { findAdfMentions, parseAdf } from './mentionUtils';

const doc = (...content) => ({ type: 'doc', version: 1, content });

const paragraph = (...content) => ({ type: 'paragraph', content });

const mention = (id, text) => ({ type: 'mention', attrs: { id, text } });

const text = (value) => ({ type: 'text', text: value });

describe('mentionUtils', () => {
  describe('parseAdf', () => {
    it('should parse a JSON string body value', () => {
      expect(parseAdf(JSON.stringify(doc(paragraph(text('hi')))))).toEqual(
        doc(paragraph(text('hi')))
      );
    });

    it('should pass through an already parsed document', () => {
      const adf = doc(paragraph(text('hi')));
      expect(parseAdf(adf)).toBe(adf);
    });

    it('should return null for empty or invalid input', () => {
      expect(parseAdf('')).toBeNull();
      expect(parseAdf(null)).toBeNull();
      expect(parseAdf(undefined)).toBeNull();
      expect(parseAdf('not json')).toBeNull();
    });
  });

  describe('findAdfMentions', () => {
    it('should find a single mention', () => {
      const adf = doc(paragraph(text('Hello '), mention('acc-1', '@John Smith')));
      expect(findAdfMentions(adf)).toEqual([
        { accountId: 'acc-1', text: 'John Smith' },
      ]);
    });

    it('should preserve full display names', () => {
      const adf = doc(
        paragraph(mention('acc-1', '@John Smith'), text(' and '), mention('acc-2', '@Jane Doe'))
      );
      expect(findAdfMentions(adf)).toEqual([
        { accountId: 'acc-1', text: 'John Smith' },
        { accountId: 'acc-2', text: 'Jane Doe' },
      ]);
    });

    it('should find mentions nested in tables and lists', () => {
      const adf = doc({
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                content: [paragraph(mention('acc-1', '@John Smith'))],
              },
            ],
          },
        ],
      });
      expect(findAdfMentions(adf)).toEqual([
        { accountId: 'acc-1', text: 'John Smith' },
      ]);
    });

    it('should de-duplicate repeated mentions, keeping document order', () => {
      const adf = doc(
        paragraph(mention('acc-1', '@John Smith')),
        paragraph(mention('acc-2', '@Jane Doe')),
        paragraph(mention('acc-1', '@John Smith'))
      );
      expect(findAdfMentions(adf)).toEqual([
        { accountId: 'acc-1', text: 'John Smith' },
        { accountId: 'acc-2', text: 'Jane Doe' },
      ]);
    });

    it('should ignore mentions without an account id', () => {
      const adf = doc(paragraph({ type: 'mention', attrs: { text: '@Unknown' } }));
      expect(findAdfMentions(adf)).toEqual([]);
    });

    it('should default to an empty name when the mention has no text', () => {
      const adf = doc(paragraph({ type: 'mention', attrs: { id: 'acc-1' } }));
      expect(findAdfMentions(adf)).toEqual([{ accountId: 'acc-1', text: '' }]);
    });

    it('should not treat plain text that looks like a mention as a mention', () => {
      const adf = doc(paragraph(text('Email user@example.com or @nobody')));
      expect(findAdfMentions(adf)).toEqual([]);
    });

    it('should return an empty array for empty input', () => {
      expect(findAdfMentions(null)).toEqual([]);
      expect(findAdfMentions(undefined)).toEqual([]);
      expect(findAdfMentions(doc())).toEqual([]);
    });
  });
});
