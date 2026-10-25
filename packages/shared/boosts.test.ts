import { describe, expect, it } from 'vitest';
import { bestBoostForDomain, boostMatchesDomain } from './boosts';

describe('Boost domain matching', () => {
  it('matches the apex and subdomains', () => {
    expect(boostMatchesDomain('example.com', 'example.com')).toBe(true);
    expect(boostMatchesDomain('example.com', 'www.example.com')).toBe(true);
    expect(boostMatchesDomain('example.com', 'mail.example.com')).toBe(true);
    expect(boostMatchesDomain('www.example.com', 'example.com')).toBe(true);
  });

  it('treats wildcard boosts as subdomain-aware', () => {
    expect(boostMatchesDomain('*.example.com', 'app.example.com')).toBe(true);
    expect(boostMatchesDomain('*.example.com', 'example.com')).toBe(true);
  });

  it('does not match lookalike hosts', () => {
    expect(boostMatchesDomain('example.com', 'notexample.com')).toBe(false);
    expect(boostMatchesDomain('example.com', 'example.com.evil.test')).toBe(false);
    expect(boostMatchesDomain('example.com', '')).toBe(false);
  });

  it('prefers the most specific Boost', () => {
    const boosts = [
      { id: 'apex', domain: 'example.com' },
      { id: 'mail', domain: 'mail.example.com' },
      { id: 'other', domain: 'other.test' },
    ];
    expect(bestBoostForDomain(boosts, 'mail.example.com')?.id).toBe('mail');
    expect(bestBoostForDomain(boosts, 'www.example.com')?.id).toBe('apex');
    expect(bestBoostForDomain(boosts, 'other.test')?.id).toBe('other');
    expect(bestBoostForDomain(boosts, 'unknown.test')).toBeUndefined();
  });
});
