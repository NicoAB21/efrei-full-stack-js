declare global {
  namespace Express {
    interface Request {
      /** Posé par requireAuth à partir du JWT. */
      userId?: string
    }
  }
}

export {}
