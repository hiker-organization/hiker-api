import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { ROLES_KEY } from "../utils/decorators/role.decorator.js";
import { Role } from "../utils/enums/role.enum.js";
import { REQUEST_TOKEN_PAYLOAD } from "../utils/constants/auth.constant.js";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {

    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredRoles) return true;

    const request: Request = context.switchToHttp().getRequest();

    const payload =
      request[REQUEST_TOKEN_PAYLOAD];

    if(!requiredRoles.includes(payload.cargo)) {
      throw new ForbiddenException("Você não possui permissão para acessar este recurso.")
    }

    return true
  }
}