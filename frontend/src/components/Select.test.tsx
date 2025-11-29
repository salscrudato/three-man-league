import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Select } from './Select'

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
]

describe('Select', () => {
  it('renders select element with options', () => {
    render(<Select options={mockOptions} />)
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<Select label="Choose option" options={mockOptions} />)
    expect(screen.getByText('Choose option')).toBeInTheDocument()
    expect(screen.getByLabelText('Choose option')).toBeInTheDocument()
  })

  it('associates label with select via htmlFor', () => {
    render(<Select label="Category" name="category" options={mockOptions} />)
    const label = screen.getByText('Category')
    const select = screen.getByLabelText('Category')
    expect(label).toHaveAttribute('for', 'category')
    expect(select).toHaveAttribute('id', 'category')
  })

  it('renders placeholder option when provided', () => {
    render(<Select placeholder="Select an option" options={mockOptions} />)
    expect(screen.getByText('Select an option')).toBeInTheDocument()
  })

  it('placeholder option is disabled', () => {
    render(<Select placeholder="Select an option" options={mockOptions} />)
    const placeholderOption = screen.getByText('Select an option')
    expect(placeholderOption).toBeDisabled()
  })

  it('handles value changes', () => {
    const handleChange = vi.fn()
    render(<Select options={mockOptions} onChange={handleChange} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'option2' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('displays error message', () => {
    render(<Select options={mockOptions} error="Please select an option" />)
    expect(screen.getByText('Please select an option')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Please select an option')
  })

  it('sets aria-invalid when error is present', () => {
    render(<Select options={mockOptions} error="Invalid selection" />)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
  })

  it('displays hint message', () => {
    render(<Select options={mockOptions} hint="Choose your preferred option" />)
    expect(screen.getByText('Choose your preferred option')).toBeInTheDocument()
  })

  it('hides hint when error is present', () => {
    render(<Select options={mockOptions} hint="Helpful hint" error="Error message" />)
    expect(screen.queryByText('Helpful hint')).not.toBeInTheDocument()
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  it('applies error styles when error is present', () => {
    render(<Select options={mockOptions} error="Error" />)
    const select = screen.getByRole('combobox')
    expect(select).toHaveClass('border-error')
  })

  it('is disabled when disabled prop is true', () => {
    render(<Select options={mockOptions} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Select options={mockOptions} className="custom-class" />)
    expect(screen.getByRole('combobox')).toHaveClass('custom-class')
  })

  it('passes through additional props', () => {
    render(<Select options={mockOptions} data-testid="test-select" />)
    expect(screen.getByTestId('test-select')).toBeInTheDocument()
  })

  it('sets aria-describedby for error', () => {
    render(<Select name="test" options={mockOptions} error="Error message" />)
    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('aria-describedby', 'test-error')
  })

  it('sets aria-describedby for hint', () => {
    render(<Select name="test" options={mockOptions} hint="Hint message" />)
    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('aria-describedby', 'test-hint')
  })

  it('generates unique id when not provided', () => {
    render(<Select label="Test" options={mockOptions} />)
    const select = screen.getByLabelText('Test')
    expect(select).toHaveAttribute('id')
    expect(select.id).toBeTruthy()
  })

  it('renders dropdown arrow icon', () => {
    render(<Select options={mockOptions} />)
    const svg = document.querySelector('svg[aria-hidden="true"]')
    expect(svg).toBeInTheDocument()
  })
})

