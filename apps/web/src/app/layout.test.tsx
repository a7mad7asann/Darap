import React from 'react';
import { render, screen } from '@testing-library/react';
import HomePage from './page';
import LoginPage from './(auth)/login/page';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

describe('Frontend RTL & Arabic Language Smoke Tests', () => {
  it('HomePage renders Arabic title and features in RTL structure', () => {
    const { container } = render(<HomePage />);

    // Verify Arabic brand text
    expect(screen.getByText('دَرب')).toBeInTheDocument();
    expect(screen.getByText(/منصة تعليمية عربية متكاملة/i)).toBeInTheDocument();

    // Verify key Arabic action buttons
    const loginLink = screen.getAllByRole('link', { name: /تسجيل الدخول|الدخول إلى لوحة التحكم/i });
    expect(loginLink.length).toBeGreaterThan(0);
  });

  it('LoginPage renders Arabic form fields and labels', () => {
    render(<LoginPage />);

    expect(screen.getByText('تسجيل الدخول')).toBeInTheDocument();
    expect(screen.getByLabelText(/اسم المستخدم/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/كلمة المرور/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: 'دخول' });
    expect(submitBtn).toBeInTheDocument();
  });
});
