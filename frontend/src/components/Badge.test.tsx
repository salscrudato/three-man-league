import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('applies neutral variant by default', () => {
    render(<Badge>Default</Badge>)
    const badge = screen.getByText('Default')
    expect(badge).toHaveClass('bg-subtle', 'text-text-secondary')
  })

  it('applies primary variant styles', () => {
    render(<Badge variant="primary">Primary</Badge>)
    const badge = screen.getByText('Primary')
    expect(badge).toHaveClass('bg-primary-soft', 'text-primary')
  })

  it('applies secondary variant styles', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    const badge = screen.getByText('Secondary')
    expect(badge).toHaveClass('bg-secondary-soft', 'text-secondary')
  })

  it('applies success variant styles', () => {
    render(<Badge variant="success">Success</Badge>)
    const badge = screen.getByText('Success')
    expect(badge).toHaveClass('bg-success-soft', 'text-success-text')
  })

  it('applies warning variant styles', () => {
    render(<Badge variant="warning">Warning</Badge>)
    const badge = screen.getByText('Warning')
    expect(badge).toHaveClass('bg-warning-soft', 'text-warning-text')
  })

  it('applies error variant styles', () => {
    render(<Badge variant="error">Error</Badge>)
    const badge = screen.getByText('Error')
    expect(badge).toHaveClass('bg-error-soft', 'text-error-text')
  })

  it('applies info variant styles', () => {
    render(<Badge variant="info">Info</Badge>)
    const badge = screen.getByText('Info')
    expect(badge).toHaveClass('bg-info-soft', 'text-info-text')
  })

  it('applies sm size by default', () => {
    render(<Badge>Small</Badge>)
    const badge = screen.getByText('Small')
    expect(badge).toHaveClass('px-1.5', 'py-0.5', 'text-tiny')
  })

  it('applies md size styles', () => {
    render(<Badge size="md">Medium</Badge>)
    const badge = screen.getByText('Medium')
    expect(badge).toHaveClass('px-2', 'py-0.5', 'text-caption')
  })

  it('renders icon when provided', () => {
    render(<Badge icon={<span data-testid="icon">★</span>}>With Icon</Badge>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('hides icon from screen readers', () => {
    render(<Badge icon={<span>★</span>}>With Icon</Badge>)
    const iconWrapper = screen.getByText('With Icon').querySelector('[aria-hidden="true"]')
    expect(iconWrapper).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>)
    expect(screen.getByText('Custom')).toHaveClass('custom-class')
  })

  it('has correct base styles', () => {
    render(<Badge>Base</Badge>)
    const badge = screen.getByText('Base')
    expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1', 'font-medium', 'rounded-badge')
  })
})

