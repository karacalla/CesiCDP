/** Mesures de performance sur le build de production : `npm run test:perf`. */
import { makeConfig } from './playwright.config'

export default makeConfig(true)
