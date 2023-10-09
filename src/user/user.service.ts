import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Brackets, Repository } from 'typeorm';

import { User } from './entities/user.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { RoleService } from '../role/role.service';
import { Role } from './enum';
import { UserDto } from './dto/user-dto';
import * as bcrypt from 'bcryptjs';

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
    //console.log("usuariosDto: ", usersDto);
    return usersDto;
  }

  async getByName(id: number) {
    if (id) {
      console.log("id if: ", id);
      const users = await this.userRepository.find({
        where: { id }, relations: ['role'], order: {
          id: 'DESC', // Orden descendente por el campo numeroRegistro
        }
      });
      const usersDto = users.map((user) => {
        return new UserDto(user);
      })
      return usersDto;
    } else {
      console.log("id else: ", id);
      return await this.getAll();
    }
  }

  // async getByName(name: string) {
  //   const filters = name.split(" ");
  //   const users = await this.userRepository.createQueryBuilder('user')
  //     .leftJoinAndSelect('user.role', 'role')
  //     .where(new Brackets((qb) => {
  //       filters.forEach((term, index) => {
  //         qb.orWhere('user.name LIKE :term' + index, { ['term' + index]: `%${term}%` })
  //           .orWhere('user.lastName LIKE :term' + index, { ['term' + index]: `%${term}%` });
  //       });
  //     }))
  //     .orderBy('user.id', 'DESC')
  //     .getMany();

  //   const usersDto = users.map((user) => {
  //     return new UserDto(user);
  //   })

  //   console.log("usuarios filtrados por nombre ", usersDto);
  //   return usersDto;
  // }

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
    console.log("nuevos datos del usuario: ", updateUserDto);
    var response = { success: false, error: '' };
    const candidate = await this.findOneByEmail(updateUserDto.email);
    console.log("existe email: ", candidate);

    if (candidate && candidate.id == id && candidate.email !== updateUserDto.email) {
      response.error = 'Email ya registrado.'
    } else {
      const role =
        updateUserDto.roleName &&
        (await this.roleService.findOneByName(updateUserDto.roleName));
      if (updateUserDto.password) {
        const hashedPassword = await bcrypt.hash(updateUserDto.password, 7);
        const responseUpdate = await this.userRepository.save({
          ...updateUserDto,
          role,
          password: hashedPassword,
        });
        console.log("response: ", response);
        if (responseUpdate) response.success = true;
      } else {
        const user = await this.userRepository.findOne(id);
        user.lastName = updateUserDto.lastName;
        user.name = updateUserDto.name;
        user.address = updateUserDto.address;
        user.email = updateUserDto.email;
        user.phoneNumber = updateUserDto.phoneNumber;
        user.userName = updateUserDto.userName;
        user.role = role;
        const responseUpdate = await this.userRepository.save(user);
        console.log("response: ", response);
        if (responseUpdate) response.success = true;
      }
    }
    return response;
    // const token = await this.tokenService.generateTokens(user.id);
    // console.log("token: ", token);
    // return token;
  }

  async remove(id: string) {
    var response = { success: false };
    const user = await this.findOne(id);

    const responseRemove = await this.userRepository.remove(user);
    console.log("response: ", response);
    if (responseRemove) response.success = true;
    return response;
  }

  async getById(id: number) {
    const user = await this.userRepository.findOne({ where: { id }, relations: ['role'] })
    if (!user) {
      throw new NotFoundException(`There is no user under id ${id}`);
    }

    return new UserDto(user);
  }

}
