import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Get('by-role')
    async byRole(
        @Query('role') role
    ) {
        console.log("role: ", role);
        return this.userService.findByRole(role);
    }

    @Get('debt-collectors')
    async debtCollectors(){
        return await this.userService.findDebtCollectors();
    }
}
