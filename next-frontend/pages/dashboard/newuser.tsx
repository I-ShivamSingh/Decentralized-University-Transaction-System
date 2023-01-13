import React from 'react'
import Router from 'next/router'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { Contract } from 'web3-eth-contract'

import localContractDetails from '../../contract.json'
import ContractAbi from '../../../contracts/university_sol_University.json'

import { UserType } from '../../enums';

import { Button, Container } from '@mui/material'
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

import NavigationBar from '../../components/navigation'

type State = {
    courses: Array<CourseDetail>,
    walletAddress: string,
    enrolledCourse: number
}

type Props = {

}

export default class NewUserDashboard extends React.Component<Props, State> {

    web3: Web3 | undefined
    userType: UserType
    courses: Array<CourseDetail>
    walletAddress: string
    contract: Contract | undefined
    enrolledCourse: number

    constructor( props: any ) {
        super( props )

        this.state = { courses: [], walletAddress: ``, enrolledCourse: -1 }

        this.userType = UserType.RandomWallet
        this.courses = []
        this.walletAddress = ``

        this.enrolledCourse = -1
    }

    private async loadPageVariables() {

        this.web3 = new Web3( window.ethereum )
        this.userType = UserType.RandomWallet

        this.courses = []

        this.walletAddress = (await this.web3.eth.requestAccounts())[0]
        this.contract = new this.web3.eth.Contract( ContractAbi as AbiItem[], localContractDetails.contractAddress )

        let coursesCount = await this.contract.methods.getCourseCount().call({ from: this.walletAddress })
        for ( let i=0; i<coursesCount; i++ ) {
            let course = await this.contract.methods.getCourseById( i ).call({ from: this.walletAddress })
            this.courses.push({ courseName: course[0], courseFees: course[1], courseId: i } as CourseDetail)
        }

        //! duplicating fix for double mounting component.
        this.courses = [ ...new Map( this.courses.map( v => [ v.courseName, v ])).values() ]

        let enrolledCourse = await this.contract.methods.getCourseIdByStudentAddress( this.walletAddress ).call({ from: this.walletAddress } )

        console.log( enrolledCourse )

        this.setState( { courses: this.courses, walletAddress: this.walletAddress, enrolledCourse } )

    }

    componentDidMount(): void {
        this.loadPageVariables()
    }

    private async enroll( courseId: number ) {

        console.log(`Enrolling for courseId: ${courseId}`)

        await this.contract?.methods.enroll( courseId ).send({ from: this.walletAddress } )
        let enrolledCourse = await this.contract?.methods.getCourseIdByStudentAddress( this.walletAddress ).call({ from: this.walletAddress } )

        this.setState( { courses: this.courses, walletAddress: this.walletAddress, enrolledCourse } )

        console.log( enrolledCourse )
    }

    render(): React.ReactNode {
        return (
            <>
                <NavigationBar pageName='University Enrollment' walletAddress={this.state.walletAddress.toLowerCase()}></NavigationBar>
                <Container >
                    <Container maxWidth="md">
                        <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                            <TableCell> Course Name </TableCell>
                            <TableCell align="center">Fees</TableCell>
                            <TableCell align="right"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.state.courses.map(( course, index ) => (
                            <TableRow
                                key={course.courseName}
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                                <TableCell component="th" scope="row">
                                    {course.courseName}
                                </TableCell>
                                <TableCell component="th" scope="row" align="center">
                                { Web3.utils.fromWei( course.courseFees, 'ether' ) } ETH
                                </TableCell>
                                <TableCell component="th" scope="row" align="center">
                                { course.courseId == this.state.enrolledCourse
                                    ? <Button disabled size="small" variant='outlined'> Enrolled </Button>
                                    : <Button size="small" variant='outlined' onClick={ () => { this.enroll( course.courseId) } }> Enroll </Button>}

                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </TableContainer>
                </Container>
            </Container>  
          </>
        )
    }
}