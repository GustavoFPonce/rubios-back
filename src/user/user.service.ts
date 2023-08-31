import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Brackets, Repository } from 'typeorm';

import { User } from './entities/user.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { RoleService } from '../role/role.service';
import { Role } from './enum';
import { UserDto } from './dto/user-dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly roleService: RoleService,
  ) { }

  async getAll() {
    const users = await this.userRepository.find({
      order: {
        id: 'DESC', // Orden descendente por el campo numeroRegistro
      },
      relations: ['role'],
    });

    const usersDto = users.map((user: User) => {
      return new UserDto(user)
    });
    // console.log("usuariosDto: ", usersDto);
    return usersDto;
  }

  async getByName(name: string) {
    const filters = name.split(" ");
    const users = await this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where(new Brackets((qb) => {
        filters.forEach((term, index) => {
          qb.orWhere('user.name LIKE :term' + index, { ['term' + index]: `%${term}%` })
            .orWhere('user.lastName LIKE :term' + index, { ['term' + index]: `%${term}%` });
        });
      }))
      .orderBy('user.id', 'DESC')
      .getMany();

    const usersDto = users.map((user) => {
      return new UserDto(user);
    })

    console.log("usuarios filtrados por nombre ", usersDto);
    return usersDto;
  }

  async findByRole(role: number) {
    // return this.userRepository.find({role})
  }

  async findDebtCollectors() {
    const role = (await this.roleService.findOneByName(Role.debtCollector));
    const debtCollectors = await this.userRepository.find({
      order: {
        id: 'DESC', // Orden descendente por el campo numeroRegistro
      },
      relations: ['role'], // Carga la relación "role" en la consulta
    });
    // console.log("debtCollectors: ", debtCollectors);
    return debtCollectors;
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne(id, {
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`There is no user under id ${id}`);
    }

    return user;
  }

  async findOneByEmail(email: string) {
    const user = await this.userRepository.findOne(
      { email },
      { relations: ['role'] },
    );

    return user;
  }

  async create(createUserDto: CreateUserDto) {
    var response = { success: false };
    const role = await this.roleService.findOneByName(createUserDto.roleName);
    console.log("rol obtenido: ", role);
    console.log("usuario a registrar: ", createUserDto);

    const user = await this.userRepository.create({
      ...createUserDto,
      role,
    });

    const responseSave = this.userRepository.save(user);
    if (responseSave) response.success = true;
    return response;

  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const role =
      updateUserDto.roleName &&
      (await this.roleService.findOneByName(updateUserDto.roleName));

    const user = await this.userRepository.preload({
      id,
      ...updateUserDto,
      role,
    });

    console.log("user modificado: ", user);

    // if (!user) {
    //   throw new NotFoundException(`There is no user under id ${id}`);
    // }

    const response = await this.userRepository.save(user);
    console.log("response: ", response);
    return response;
  }

  async remove(id: string) {
    var response = {success: false};
    const user = await this.findOne(id);

    const responseRemove = await this.userRepository.remove(user);
    console.log("response: ", response);
    if(responseRemove) response.success = true;
    return response;
  }

}
