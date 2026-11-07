import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// sans `globals`, Testing Library ne nettoie pas le DOM entre deux tests
afterEach(() => cleanup())
