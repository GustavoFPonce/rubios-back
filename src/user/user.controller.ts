import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
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
    async debtCollectors() {
        return await this.userService.findDebtCollectors();
    }

    @Get()
    async getAll() {
        return await this.userService.getAll();
    }

    @Get('by-name')
    async getByName(
        @Query('name') name: string
    ) {
        console.log("name: ", name);
        return this.userService.getByName(name);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() user: any
    ) {
        console.log("id: ", id);
        console.log("user: ", user);
        return this.userService.update(id, user);
    }

    @Delete(':id')
    async delete(
        @Param('id') id: string
    ) {
        console.log("id: ", id);
        return this.userService.remove(id);
    }
}
