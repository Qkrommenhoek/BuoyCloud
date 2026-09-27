package com.buoybuddy.controller

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.RequestMapping

/**
 * Forwards client-side routes (e.g. `/login`, `/register` when hit with a plain GET,
 * or any React Router path) to the SPA shell so a full page load/refresh doesn't 404.
 *
 * Paths containing a dot (real static files like `/assets/index.js`) and anything under
 * the API prefix are excluded so they're handled by the resource handler and REST
 * controllers respectively rather than this catch-all.
 */
@Controller
class SpaController {
    @RequestMapping(value = ["/{path:^(?!api$)[^.]*}", "/{path:^(?!api$)[^.]*}/{subPath:[^.]*}"])
    fun forward(): String = "forward:/index.html"
}
