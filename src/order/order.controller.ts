import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

import { Permission } from 'src/role/decorators/permission.decorator';

import { PermissionGuard } from 'src/role/guards/permission.guard';

import { AuthService } from 'src/auth/auth.service';
import { OrderService } from './order.service';

@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly authService: AuthService,
  ) {}

  @Permission('GET_ORDER_ALL')
  @UseGuards(PermissionGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Permission('GET_ORDER_SELF')
  @UseGuards(PermissionGuard)
  @Get()
  async findAllByUserId(@Req() req: Request) {
    const { id } = await this.authService.parseAuthorizationHeaders(
      req.headers.authorization,
    );

    return this.orderService.findAllByUserId(id);
  }

  @Permission('CREATE_ORDER_SELF')
  @UseGuards(PermissionGuard)
  @Post()
  async create(@Req() req: Request, @Body() createOrderDto: CreateOrderDto) {
    const { id } = await this.authService.parseAuthorizationHeaders(
      req.headers.authorization,
    );
    createOrderDto.userId = id;

    return this.orderService.create(createOrderDto);
  }

  @Permission('UPDATE_ORDER_ALL')
  @UseGuards(PermissionGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.orderService.update(id, updateOrderDto);
  }

  @Permission('REMOVE_ORDER_ALL')
  @UseGuards(PermissionGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.orderService.remove(id);
  }
}
