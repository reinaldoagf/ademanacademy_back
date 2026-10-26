// prisma/seed.ts
import { ProfileType, Kinship, ClassroomType, ClassroomStatus, TypeOfContract, PayrollStatus, ClientType } from '@prisma/client';
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
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.setting.deleteMany();

    console.log('🧹 Tablas limpiadas correctamente.');

    // ==========================================
    // 2. CREACIÓN DE USUARIOS (Administradores / Instructores)
    // ==========================================
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('12345678', salt);
    const admin = await prisma.user.create({
        data: {
            IDNumberPrefix: 'V',
            dni: '12345678',
            firstName: 'Valentina',
            lastName: 'Birrot',
            email: 'admin@academia.com',
            birthDate: new Date('1990-05-15'),
            countryCode: '+58',
            phone: '4141112233',
            password: hashedPassword, // Recuerda hashear en producción
            isAdmin: true,
            profileOnboarding: true,
        },
    });

    // Opcional: Eliminar empleados existentes para evitar duplicados

    const employeesData = [
        {
            IDNumberPrefix: 'V',
            dni: '18456789',
            firstName: 'Carlos',
            lastName: 'Mendoza',
            email: 'carlos@ademanacademy.com',
            birthDate: new Date('1990-05-15'),
            typeOfContract: TypeOfContract.Fijo, // Ajusta según tus valores de Enum
            medicalObservations: 'Alergico a la penicilina',
            address: 'Av. Las Américas, Res. El Sol, Apto 4B, Guayana',
            countryCode: '+58',
            phone: '4141234567',
            hoursTaughtMonth: 40,
            hourlyRate: 15.50,
            payrollStatus: PayrollStatus.Pendiente,
        },
        {
            IDNumberPrefix: 'V',
            dni: '20123456',
            firstName: 'María',
            lastName: 'Rodríguez',
            email: 'maria@ademanacademy.com',
            birthDate: new Date('1995-10-22'),
            typeOfContract: TypeOfContract.Fijo,
            medicalObservations: null,
            address: 'Calle Los Olivos, Casa #12, Puerto Ordaz',
            countryCode: '+58',
            phone: '4249876543',
            hoursTaughtMonth: 32,
            hourlyRate: 18.00,
            payrollStatus: PayrollStatus.Pendiente,
        },
        {
            IDNumberPrefix: 'V',
            dni: '23555888',
            firstName: 'Alejandro',
            lastName: 'Gómez',
            email: 'alejandro@ademanacademy.com',
            birthDate: new Date('1988-03-08'),
            typeOfContract: TypeOfContract.Fijo,
            medicalObservations: 'Usual control de hipertensión ligera',
            address: 'Sector Castillito, Carrera Aripao #45',
            phone: null, // Campo opcional
            hoursTaughtMonth: 20,
            hourlyRate: 12.00,
            payrollStatus: PayrollStatus.Pendiente,
        },
        {
            IDNumberPrefix: 'V',
            dni: '15999000',
            firstName: 'Ana',
            lastName: 'Martínez',
            email: 'ana@ademanacademy.com',
            birthDate: new Date('1985-12-01'),
            typeOfContract: TypeOfContract.Fijo,
            medicalObservations: null,
            address: 'Urbanización Alta Vista, Torres del Core8',
            countryCode: '+58',
            phone: '4125551234',
            hoursTaughtMonth: 50,
            hourlyRate: 20.00,
            payrollStatus: PayrollStatus.Pendiente,
        },
    ];

    // Insertar cada empleado en la base de datos
    for (const employee of employeesData) {
        const createdEmployee = await prisma.employee.create({
            data: employee,
        });
        console.log(`✅ Empleado creado: ${createdEmployee.firstName} ${createdEmployee.lastName} (${createdEmployee.id})`);
    }

    const user = await prisma.user.create({
        data: {
            IDNumberPrefix: 'V',
            dni: '11223344',
            firstName: 'Alonso',
            lastName: 'Fermin',
            email: 'alonso.rep@gmail.com',
            birthDate: new Date('1990-05-15'),
            countryCode: '+58',
            phone: '4125554433',
            password: hashedPassword,
            isAdmin: false,
            profileOnboarding: true,
            profileType: ProfileType.Representante,
            occupation: 'Ingeniero de Software',
        },
    });

    console.log('👥 Usuarios creados.');

    // ==========================================
    // 3. CREACIÓN DE ALUMNOS (Students)
    // ==========================================
    // 2. Crear primero el registro de Student (Representado / Alumno)
    const student1 = await prisma.student.create({
        data: {
            shirtSize: 'S',
            kinship: Kinship.Hija,
            hasExperience: false,
            medicalObservations: '',
            // groupId: 'ID_DEL_GRUPO', // Opcional si ya tienes un grupo creado
        },
    });
    const student2 = await prisma.student.create({
        data: {
            shirtSize: 'M',
            kinship: Kinship.Hija,
            hasExperience: false,
            medicalObservations: '',
            // groupId: 'ID_DEL_GRUPO', // Opcional si ya tienes un grupo creado
        },
    });
    // 3. Crear el Client asignándole el studentId y userId correspondientes
    const client1 = await prisma.client.create({
        data: {
            firstName: 'Pedro',
            lastName: 'Pérez',
            birthDate: new Date('2018-05-15'),
            address: 'Alta Vista, Puerto Ordaz, Bolívar',
            IDNumberPrefix: 'V',
            dni: '32145678',
            countryCode: '+58',
            phone: '4121234567', // Opcional
            type: ClientType.Representante, // O el tipo de cliente que corresponda
            userId: user.id, // Enlazado a su usuario/representante
        },
    });
    const client2 = await prisma.client.create({
        data: {
            firstName: 'Jessica',
            lastName: 'Pérez',
            birthDate: new Date('2018-05-15'),
            address: 'Alta Vista, Puerto Ordaz, Bolívar',
            IDNumberPrefix: 'V',
            dni: '32145678',
            countryCode: '+58',
            phone: '4141234567', // Opcional
            type: ClientType.Estudiante, // O el tipo de cliente que corresponda
            representativeId: user.id, // Enlazado a su usuario/representante
            studentId: student1.id, // 🎯 Enlazado al estudiante creado previamente
        },
    });
    const client3 = await prisma.client.create({
        data: {
            firstName: 'Mariana',
            lastName: 'Pérez',
            birthDate: new Date('2018-05-15'),
            address: 'Alta Vista, Puerto Ordaz, Bolívar',
            IDNumberPrefix: 'V',
            dni: '22145678',
            countryCode: '+58',
            phone: '4141234562', // Opcional
            type: ClientType.Estudiante, // O el tipo de cliente que corresponda
            representativeId: user.id, // Enlazado a su usuario/representante
            studentId: student2.id, // 🎯 Enlazado al estudiante creado previamente
        },
    });
    // ==========================================
    // 4. CREACIÓN DE SALONES (Classrooms)
    // ==========================================
    const classroomMirrors = await prisma.classroom.create({
        data: {
            name: 'Salón Principal Espejos',
            address: 'Piso 1, Ala Norte',
            maxCapacity: 25,
            type: ClassroomType.Espejos,
            status: ClassroomStatus.Activo,
            description: 'Salón amplio equipado con barras de ballet y espejos de cuerpo completo.',
        },
    });

    const classroomUrban = await prisma.classroom.create({
        data: {
            name: 'Módulo Urbano',
            address: 'Piso 2, Ala Sur',
            maxCapacity: 20,
            type: ClassroomType.Urbano,
            status: ClassroomStatus.Activo,
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
    await prisma.setting.create({
        data: {
            key: 'usage_policies',
            value: 'Políticas de uso',
            active: true
        },
    });


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