import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('user')
@UseGuards(JwtAuthGuard)
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
        @Query('name') name: number
    ) {
        //console.log("name: ", name);
        return this.userService.getByName(name);
    }

    @Put(':id')
    async update(
        @Param('id') id: string,
        @Body() user: any
    ) {
        // console.log("id: ", id);
        // console.log("user: ", user);
        return this.userService.update( id, user);
    }

    @Delete(':id')
    async delete(
        @Param('id') id: string
    ) {
        console.log("id: ", id);
        return this.userService.remove(id);
    }

    @Get(':id/credits')
    async getCredits(
        @Param('id') id: number
    ){
       //console.log("id: ", id);
        return await this.userService.getCredits(id);
    }

    @Get(':id/credits-by-client')
    async getCreditsByClient(
        @Param('id') id: number,
        @Query('client') clientId: any
    ){
       //console.log("id: ", id);
        return await this.userService.getCreditsByClient(id, clientId);
    }

    @Get(':id')
    async getById(
        @Param('id') id: number
    ){
       //console.log("id: ", id);
        return await this.userService.getById(id);
    }
}
