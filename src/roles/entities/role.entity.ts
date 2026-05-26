import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
  })
  name: 'admin' | 'organizer' | 'client';

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}