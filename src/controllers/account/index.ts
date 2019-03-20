import { BaseContext } from 'koa'
import * as Strings from '../../helpers/strings'
import * as Methods from '../../helpers/methods'
import {
  getStoredVerifierHash,
  generateAndStoreToken,
  deleteSelector
} from './account'

export default class AccountController {
  // Endpoint to create hash to send in email to the user on login
  public static async login (ctx: BaseContext) {
    const { email } = ctx.request.body
    ctx.assert(email, 400, Strings.EmailIsRequired)

    // Generate token, store it
    const emailToken = await generateAndStoreToken(ctx, false)
    try {
      await Methods.sendMagicLinkEmail(email, emailToken)
      ctx.body = { ok: true }
    } catch (e) {
      console.log(e)
      ctx.body = { ok: false, message: e.message || 'unknown error' }
    }
  }

  // Endpoint to create hash to send in email to the user on register
  public static async register (ctx: BaseContext) {
    const { email, role } = ctx.request.body
    ctx.assert(email, 400, Strings.EmailIsRequired)
    ctx.assert(role, 400, Strings.RoleIsRequired)

    // Generate token, store it
    const emailToken = await generateAndStoreToken(ctx, false)
    try {
      await Methods.sendMagicLinkEmail(email, emailToken)
      ctx.body = { ok: true }
    } catch (e) {
      ctx.body = { ok: false, message: e.message || 'unkonwn error' }
    }
  }

  // Endpoint to verify hash from email magic link and send back auth token
  public static async verifyAuth (ctx: BaseContext) {
    const { email, auth } = ctx.request.body
    ctx.assert(email, 400, Strings.EmailIsRequired)
    ctx.assert(auth, 400, Strings.AuthIsRequired)

    // Look up hash sent in request in the db 
    try {
      const sessionInfo = await getStoredVerifierHash(ctx.request.body.auth)
      // delete the short term session
      await deleteSelector(sessionInfo)
      
      // If email matches the tokens email, they're authd and we should replace 
      // token with long lasting token and respond with that token + an ok status
      if (sessionInfo.email === email) {
        
        // Generate long live token, store it
        const longLiveToken = await generateAndStoreToken(ctx, true)

        ctx.status = 200
        ctx.cookies.set('tfauth', longLiveToken)
        ctx.body = { ok: true }
      }
    } catch (e) {
      console.log(e)
      ctx.status = 200
      ctx.body = { ok: false }
    }
  }
}
