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
import { Credit } from 'src/credit/entities/credit.entity';
import { SaleCredit } from 'src/sale-credit/entities/sale-credit.entity';
import { CreditListDto } from 'src/credit/dto/credit-list.dto';
import { SaleCreditHistory } from 'src/sale-credit/entities/sale-credit-history.entity';
import { Client } from 'src/client/entities/client.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Credit) private readonly creditRepository: Repository<Credit>,
    @InjectRepository(SaleCredit) private readonly saleCreditRepository: Repository<SaleCredit>,
    @InjectRepository(Client) private readonly clientRepository: Repository<Client>,
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

    if (candidate && candidate.id != id && candidate.email == updateUserDto.email) {
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

  async getCredits(id: number) {
    const personalCredits = await this.getCreditsByType(id, this.creditRepository, 1, null);
    const saleCredits = await this.getCreditsByType(id, this.saleCreditRepository, 2, null);
    var credits = [];
    personalCredits.map(credit => {
      const creditList = new CreditListDto(credit);
      const creditDto = { ...creditList, type: 1 }
      credits.push(creditDto);
    });
    saleCredits.map(credit => {
      const creditList = new CreditListDto(credit);
      const creditDto = { ...creditList, type: 2 }
      credits.push(creditDto);
    });

    console.log("credits: ", credits);
    return credits;
  }

  private async getCreditsByType(id: number, creditRepository: any, type: number, clientId: any) {
    const queryBuilder = creditRepository
      .createQueryBuilder('credit')
      .leftJoinAndSelect('credit.creditHistory', 'creditHistory')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MAX(creditHistory.id)')
          .from((type === 1) ? Credit : SaleCreditHistory, 'creditHistory')
          .where((type === 1) ? 'creditHistory.credit_id = credit.id' : 'creditHistory.sale_credit_id = credit.id')
          .getQuery();
        return `creditHistory.id = ${subQuery}`;
      })
      .leftJoinAndSelect('credit.debtCollector', 'debtCollector')
      .leftJoinAndSelect('credit.client', 'client')
      .where('credit.debtCollector = :id', { id })
      .orderBy('creditHistory.date', 'DESC')
      .addOrderBy('creditHistory.id', 'DESC')

      if(clientId){
        queryBuilder.andWhere('client.id = :clientId', {clientId})
      }

    return await queryBuilder.getMany();
  }

  async getCreditsByClient(id: number, clientId: any) {
    console.log("clientId: ", clientId);
    const client = await this.clientRepository.findOne({ where: { id: clientId } });
    console.log("client: ", client);
    var creditsDto = [];
    if (!client) {
      creditsDto = await this.getCredits(id);
    } else {    
      var credits = []; 
      if (client.type == 1) {
        console.log("client type 1: ");
        credits = await this.getCreditsByType(id, this.creditRepository, 1, client.id);
        console.log("client type 1 credits: ",credits);
      } else {
        credits = await this.getCreditsByType(id, this.saleCreditRepository, 2, client.id);
      }
       credits.map(credit => {
        const creditList = new CreditListDto(credit);
        const creditDto = { ...creditList, type:(client.type == 1)? 1:2 }
        creditsDto.push(creditDto);
      });
    }
    
    console.log("credits: ", creditsDto);
    return creditsDto;
  }

}
