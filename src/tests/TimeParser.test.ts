import { TimeParser } from '../utils/timeParser';

describe('TimeParser', () => {
  describe('parseTime', () => {
    describe('relative time parsing', () => {
      it('should parse seconds correctly', () => {
        const result = TimeParser.parseTime('30s');
        
        expect(result.isValid).toBe(true);
        expect(result.delayMs).toBe(30 * 1000);
        expect(result.originalInput).toBe('30s');
      });

      it('should parse minutes correctly', () => {
        const result = TimeParser.parseTime('45m');
        
        expect(result.isValid).toBe(true);
        expect(result.delayMs).toBe(45 * 60 * 1000);
        expect(result.originalInput).toBe('45m');
      });

      it('should parse hours correctly', () => {
        const result = TimeParser.parseTime('6h');
        
        expect(result.isValid).toBe(true);
        expect(result.delayMs).toBe(6 * 60 * 60 * 1000);
        expect(result.originalInput).toBe('6h');
      });

      it('should parse days correctly', () => {
        const result = TimeParser.parseTime('2d');
        
        expect(result.isValid).toBe(true);
        expect(result.delayMs).toBe(2 * 24 * 60 * 60 * 1000);
        expect(result.originalInput).toBe('2d');
      });

      it('should parse weeks correctly', () => {
        const result = TimeParser.parseTime('1w');
        
        expect(result.isValid).toBe(true);
        expect(result.delayMs).toBe(7 * 24 * 60 * 60 * 1000);
        expect(result.originalInput).toBe('1w');
      });

      it('should reject invalid relative time formats', () => {
        const result = TimeParser.parseTime('invalid');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should reject zero or negative values', () => {
        const result = TimeParser.parseTime('0h');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('greater than 0');
      });
    });

    describe('absolute time parsing', () => {
      beforeEach(() => {
        // Mock current time to a known value for consistent testing
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should parse 12-hour format with AM', () => {
        const result = TimeParser.parseTime('9:00am');
        
        expect(result.isValid).toBe(true);
        expect(result.originalInput).toBe('9:00am');
      });

      it('should parse 12-hour format with PM', () => {
        const result = TimeParser.parseTime('2:30pm');
        
        expect(result.isValid).toBe(true);
        expect(result.originalInput).toBe('2:30pm');
      });

      it('should parse 24-hour format', () => {
        const result = TimeParser.parseTime('14:30');
        
        expect(result.isValid).toBe(true);
        expect(result.originalInput).toBe('14:30');
      });

      it('should handle 12 AM correctly', () => {
        const result = TimeParser.parseTime('12:00am');
        
        expect(result.isValid).toBe(true);
        expect(result.originalInput).toBe('12:00am');
      });

      it('should handle 12 PM correctly', () => {
        const result = TimeParser.parseTime('12:00pm');
        
        expect(result.isValid).toBe(true);
        expect(result.originalInput).toBe('12:00pm');
      });

      it('should reject invalid time values', () => {
        const result = TimeParser.parseTime('25:00');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid time values');
      });
    });

    describe('date-time parsing', () => {
      it('should parse MM/DD/YYYY HH:MM format', () => {
        const result = TimeParser.parseTime('12/25/2024 9:00am');
        
        expect(result.isValid).toBe(true);
        expect(result.originalInput).toBe('12/25/2024 9:00am');
      });

      it('should reject past dates', () => {
        const result = TimeParser.parseTime('1/1/2020 9:00am');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('past');
      });
    });

    describe('UNIX timestamp parsing', () => {
      it('should parse 10-digit timestamps (seconds)', () => {
        const result = TimeParser.parseTime('1640995200');
        
        expect(result.isValid).toBe(true);
        expect(result.originalInput).toBe('1640995200');
      });

      it('should parse 13-digit timestamps (milliseconds)', () => {
        const result = TimeParser.parseTime('1640995200000');
        
        expect(result.isValid).toBe(true);
        expect(result.originalInput).toBe('1640995200000');
      });

      it('should reject past timestamps', () => {
        const pastTimestamp = Math.floor((Date.now() - 86400000) / 1000).toString();
        const result = TimeParser.parseTime(pastTimestamp);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('past');
      });
    });

    describe('natural language parsing', () => {
      it('should parse "tomorrow 9am"', () => {
        const result = TimeParser.parseTime('tomorrow 9am');
        
        expect(result.isValid).toBe(true);
        expect(result.originalInput).toBe('tomorrow 9am');
      });

      it('should parse day names', () => {
        const result = TimeParser.parseTime('monday');
        
        expect(result.isValid).toBe(true);
        expect(result.originalInput).toBe('monday');
      });
    });
  });

  describe('formatDelay', () => {
    it('should format milliseconds correctly', () => {
      expect(TimeParser.formatDelay(500)).toBe('500ms');
    });

    it('should format seconds correctly', () => {
      expect(TimeParser.formatDelay(30000)).toBe('30s');
    });

    it('should format minutes correctly', () => {
      expect(TimeParser.formatDelay(120000)).toBe('2m');
    });

    it('should format hours correctly', () => {
      expect(TimeParser.formatDelay(7200000)).toBe('2h');
    });

    it('should format days correctly', () => {
      expect(TimeParser.formatDelay(172800000)).toBe('2d');
    });

    it('should handle mixed units', () => {
      expect(TimeParser.formatDelay(7323000)).toBe('2h 2m 3s');
    });
  });

  describe('validateDelay', () => {
    it('should accept valid delays', () => {
      const result = TimeParser.validateDelay(3600000, 30); // 1 hour
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject zero delays', () => {
      const result = TimeParser.validateDelay(0, 30);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should reject negative delays', () => {
      const result = TimeParser.validateDelay(-1000, 30);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('should reject delays exceeding max days', () => {
      const maxDelay = 31 * 24 * 60 * 60 * 1000; // 31 days
      const result = TimeParser.validateDelay(maxDelay, 30);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('30 days');
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const result = TimeParser.parseTime('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle whitespace-only strings', () => {
      const result = TimeParser.parseTime('   ');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle case-insensitive parsing', () => {
      const result1 = TimeParser.parseTime('6H');
      const result2 = TimeParser.parseTime('6h');
      
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result1.delayMs).toBe(result2.delayMs);
    });
  });
});
