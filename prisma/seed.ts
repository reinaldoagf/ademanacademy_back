// prisma/seed.ts
import { ProfileType, Kinship, ClassroomType, ClassroomStatus, TypeOfContract, PayrollStatus } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service'; // 🎯 1. Importa tu propio servicio
import * as bcrypt from 'bcrypt';

// 🎯 2. Instanciamos TU servicio en lugar del PrismaClient genérico
// Al hacer esto, se ejecutará automáticamente el constructor que creaste con el adaptador de MariaDB
const prisma = new PrismaService();

async function main() {
    console.log('🌱 Empezando el proceso de seeding...');

    // 1. LIMPIEZA DE TABLAS (Opcional pero recomendado para evitar duplicados al re-ejecutar)
    // El orden importa debido a las restricciones de llaves foráneas en MySQL
    await prisma.weeklySchedule.deleteMany();
    await prisma.group.deleteMany();
    await prisma.classroom.deleteMany();
    await prisma.student.deleteMany();
    await prisma.user.deleteMany();
    await prisma.employee.deleteMany();

    console.log('🧹 Tablas limpiadas correctamente.');

    // ==========================================
    // 2. CREACIÓN DE USUARIOS (Administradores / Instructores)
    // ==========================================
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('12345678', salt);
    const admin = await prisma.user.create({
        data: {
            dni: 'V-12345678',
            name: 'Carlos Administrador',
            email: 'admin@academia.com',
            phone: '+584141112233',
            password: hashedPassword, // Recuerda hashear en producción
            isAdmin: true,
            profileOnboarding: true,
        },
    });

    // Opcional: Eliminar empleados existentes para evitar duplicados

    const employeesData = [
        {
            dni: 'V-18456789',
            firstName: 'Carlos',
            lastName: 'Mendoza',
            birthDate: new Date('1990-05-15'),
            typeOfContract: TypeOfContract.fixed, // Ajusta según tus valores de Enum
            medicalObservations: 'Alergico a la penicilina',
            address: 'Av. Las Américas, Res. El Sol, Apto 4B, Guayana',
            phone: '+58 414 1234567',
            hoursTaughtMonth: 40,
            hourlyRate: 15.50,
            bonus: 50.00,
            payrollStatus: PayrollStatus.pending,
        },
        {
            dni: 'V-20123456',
            firstName: 'María',
            lastName: 'Rodríguez',
            birthDate: new Date('1995-10-22'),
            typeOfContract: TypeOfContract.fixed,
            medicalObservations: null,
            address: 'Calle Los Olivos, Casa #12, Puerto Ordaz',
            phone: '+58 424 9876543',
            hoursTaughtMonth: 32,
            hourlyRate: 18.00,
            bonus: 75.50,
            payrollStatus: PayrollStatus.pending,
        },
        {
            dni: 'V-23555888',
            firstName: 'Alejandro',
            lastName: 'Gómez',
            birthDate: new Date('1988-03-08'),
            typeOfContract: TypeOfContract.fixed,
            medicalObservations: 'Usual control de hipertensión ligera',
            address: 'Sector Castillito, Carrera Aripao #45',
            phone: null, // Campo opcional
            hoursTaughtMonth: 20,
            hourlyRate: 12.00,
            bonus: 30.00,
            payrollStatus: PayrollStatus.pending,
        },
        {
            dni: 'V-15999000',
            firstName: 'Ana',
            lastName: 'Martínez',
            birthDate: new Date('1985-12-01'),
            typeOfContract: TypeOfContract.fixed,
            medicalObservations: null,
            address: 'Urbanización Alta Vista, Torres del Core8',
            phone: '+58 412 5551234',
            hoursTaughtMonth: 50,
            hourlyRate: 20.00,
            bonus: 100.00,
            payrollStatus: PayrollStatus.pending,
        },
    ];

    // Insertar cada empleado en la base de datos
    for (const employee of employeesData) {
        const createdEmployee = await prisma.employee.create({
            data: employee,
        });
        console.log(`✅ Empleado creado: ${createdEmployee.firstName} ${createdEmployee.lastName} (${createdEmployee.id})`);
    }

    const representative = await prisma.user.create({
        data: {
            dni: 'V-11223344',
            name: 'Juan Representante',
            email: 'juan.rep@gmail.com',
            phone: '+584125554433',
            password: hashedPassword,
            isAdmin: false,
            profileOnboarding: true,
            profileType: ProfileType.representative,
            occupation: 'Ingeniero de Software',
        },
    });

    console.log('👥 Usuarios creados.');

    // ==========================================
    // 3. CREACIÓN DE ALUMNOS (Students)
    // ==========================================
    const student1 = await prisma.student.create({
        data: {
            firstName: 'Pedrito',
            lastName: 'Pérez',
            birthDate: new Date('2018-05-15'),
            kinship: Kinship.son,
            medicalObservations: 'Ninguna',
            address: 'Alta Vista, Puerto Ordaz, Bolívar',
            shirtSize: '10',
            hasExperience: false,
            userId: representative.id, // Enlazado a su representante
        },
    });

    console.log('👶 Estudiantes creados.');

    // ==========================================
    // 4. CREACIÓN DE SALONES (Classrooms)
    // ==========================================
    const classroomMirrors = await prisma.classroom.create({
        data: {
            name: 'Salón Principal Espejos',
            address: 'Piso 1, Ala Norte',
            maxCapacity: 25,
            type: ClassroomType.mirrors,
            status: ClassroomStatus.active,
            description: 'Salón amplio equipado con barras de ballet y espejos de cuerpo completo.',
        },
    });

    const classroomUrban = await prisma.classroom.create({
        data: {
            name: 'Módulo Urbano',
            address: 'Piso 2, Ala Sur',
            maxCapacity: 20,
            type: ClassroomType.urban,
            status: ClassroomStatus.active,
            description: 'Salón con aislamiento acústico ideal para ritmos urbanos y breaks.',
        },
    });

    console.log('🏢 Salones de clase creados.');
    const categoryBaby = await prisma.groupCategory.upsert({
        where: { name: 'Baby' },
        update: {},
        create: {
            name: 'Baby',
            minimumAge: 3,
            maximumAge: 5,
        },
    });

    const categoryYouth = await prisma.groupCategory.upsert({
        where: { name: 'Youth' },
        update: {},
        create: {
            name: 'Youth',
            minimumAge: 12,
            maximumAge: 17,
        },
    });

    const skip = Math.floor(Math.random() * 1);
    const instructor1 = await prisma.employee.findFirst({ skip: skip });
    if (instructor1) {
        // ==========================================
        // 5. CREACIÓN DE GRUPOS (Groups)
        // ==========================================
        const groupBabyDance = await prisma.group.create({
            data: {
                name: 'Baby Dance - Nivel 1',
                totalNumberOfSlots: 15,
                categoryId: categoryBaby.id,
                instructorId: instructor1.id, // Vinculado a María
                classroomId: classroomMirrors.id, // Vinculado al Salón de Espejos
            },
        });

        const groupUrbanYouth = await prisma.group.create({
            data: {
                name: 'Hip Hop Juvenil',
                totalNumberOfSlots: 20,
                categoryId: categoryYouth.id,
                instructorId: instructor1.id,
                classroomId: classroomUrban.id,
            },
        });


        console.log('🕺 Grupos de danza creados.');

        // ==========================================
        // 6. CREACIÓN DE HORARIOS SEMANALES (WeeklySchedule)
        // ==========================================
        // Estructuramos el JSON tal cual lo solicita tu frontend y el default del modelo
        const scheduleDataBaby = {
            lunes: [{ id: 'b1', startTime: '15:00', endTime: '16:30', label: 'Técnica' }],
            martes: [],
            miércoles: [{ id: 'b2', startTime: '15:00', endTime: '16:30', label: 'Coreografía' }],
            jueves: [],
            viernes: [],
            sábado: [],
            domingo: [],
        };

        const scheduleDataUrban = {
            lunes: [],
            martes: [{ id: 'u1', startTime: '17:00', endTime: '18:30', label: 'Breaking Basics' }],
            miércoles: [],
            jueves: [{ id: 'u2', startTime: '17:00', endTime: '18:30', label: 'Crew Practice' }],
            viernes: [],
            sábado: [{ id: 'u3', startTime: '10:00', endTime: '12:00', label: 'Ensayo Intensivo' }],
            domingo: [],
        };

        await prisma.weeklySchedule.create({
            data: {
                schedule: scheduleDataBaby,
                groupId: groupBabyDance.id,
                classroomId: classroomMirrors.id,
            },
        });

        await prisma.weeklySchedule.create({
            data: {
                schedule: scheduleDataUrban,
                groupId: groupUrbanYouth.id,
                classroomId: classroomUrban.id,
            },
        });

    }

    console.log('📅 Horarios semanales inyectados.');
    console.log('🏁 ¡Seeding completado con éxito!');
}

main()
    .catch((e) => {
        console.error('❌ Error ejecutando el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });