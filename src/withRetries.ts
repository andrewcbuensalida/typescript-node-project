async function withRetries(
  fn: () => Promise<any>,
  retries: number = 3,
  delay: number = 1000
): Promise<any> {
  let attempt = 0
  while (attempt < retries) {
    try {
      return await fn()
    } catch (err) {
      attempt++
      if (attempt >= retries) {
        console.error('Max retries reached')
        throw err
      }
      console.log(`Retrying... (${attempt}/${retries})`)
      await new Promise((res) => setTimeout(res, delay))
    }
  }
}

export { withRetries }
