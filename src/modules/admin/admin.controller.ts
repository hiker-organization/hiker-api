import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AuthToken } from '../auth/guard/auth.guard.js';
import { TokenPayloadParam } from '../auth/utils/param/token-payload.param.js';
import { PayloadDTO } from '../auth/dto/payload.dto.js';
import { RolesGuard } from '../auth/guard/role.guard.js';
import { Roles } from '../auth/utils/decorators/role.decorator.js';
import { Role } from '../auth/utils/enums/role.enum.js';

@UseGuards(AuthToken)
@Controller('admin')
export class AdminController {
    constructor(private readonly service: AdminService) {}

    @Post()
    set(@TokenPayloadParam() token: PayloadDTO) {
        return this.service.admin(token)
    }

    @UseGuards(AuthToken, RolesGuard)
    @Roles(Role.ADMIM)
    @Get('dashboard')
    dashboard() {
        return "ooooooiiii"
    }
}
